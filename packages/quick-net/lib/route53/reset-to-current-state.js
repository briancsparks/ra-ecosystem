
/**
 * @file
 *
 * Look at DNS, and look at running/stopped instances and state. Delete Route 53 items
 * that are pointing to non-running instances, and add/change Route 53 items to be
 * accurate for running instances.
 */
const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-diag');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-argv'));
const {_}                     = sg;
const qm                      = require('quick-merge').quickMergeImmutable;
const util                    = require('util');
const { awsService }          = require('../aws');
const ec2                     = awsService('EC2');
const route53                 = awsService('Route53');
const libEnumRecords          = require('./enum-records');
const {crackFqdn}             = require('./utils');
const {normalizeItems}        = require('../aws3');
const getAllRecords           = util.promisify(libEnumRecords.getAllRecords);

const mod                     = ra.modSquad(module, 'quickNetRoute53');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();
const ARGV                    = sg.ARGV();

const dg                      = DIAG.dg;


function recordSetIps(record) {
  return sg.keyMirror(record.ResourceRecordSet.ResourceRecords.map(rs => rs.Value));
}

function assocInstance(fqdnDotInstances, rsName) {
  var instances = fqdnDotInstances[rsName];
  if (instances && instances.length > 0) {
    return  instances[0];
  }
}

function mergeIpDelta(record, PublicIpAddress) {
  const ResourceRecordSet = {...record.ResourceRecordSet, ResourceRecords:[{Value: PublicIpAddress}]};
  const delta = {...record, ResourceRecordSet};
  return delta;
}

function mergeRrs(a, b) {
  const ResourceRecords     = b.ResourceRecordSet.ResourceRecords || a.ResourceRecordSet.ResourceRecords;
  const ResourceRecordSet   = { ...a.ResourceRecordSet,
    ...b.ResourceRecordSet,
    ResourceRecords
  };

  return ResourceRecordSet;
}

function mkIpDelta(ip) {
  return {ResourceRecordSet:{ResourceRecords:[{Value:ip}]}};
}

function mkAction(HostedZoneId, delta) {
  var result = {
    HostedZoneId,
    ChangeBatch: {
      Changes:[{
        Action: "UPSERT",
        delta
      }]
    }
  };

  return result;
}

// =============================================================================================
DIAG.usage({ aliases: { resetDnsToCurrent: { args: {
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--domain=cdr0.net --debug`);
DIAG.activeName = 'resetDnsToCurrent';

mod.async(DIAG.async({resetDnsToCurrent: async function(argv, context) {
  const diag    = DIAG.diagnostic({argv, context});
  const domain  = argv.domain;

  var instances;
  var P_instances;

  if (!argv.json) {
    // Get the request for instance list going
    P_instances = ec2.describeInstances({}).promise();
  } else {
    instances = argv.json.instances;
  }

  var ipInstances;
  var fqdnInstances;
  var fqdnDotInstances;

  const initialSync = async function() {
    instances = instances || normalizeItems(await P_instances).Instances;

    ipInstances         = _.groupBy(instances.filter(instance => instance.PublicIpAddress), 'PublicIpAddress');
    fqdnInstances       = _.groupBy(instances.filter(instance => instance.tag_qn_fqdns),    'tag_qn_fqdns');
    fqdnDotInstances    = sg.reduce(fqdnInstances, {}, (m,v,k) => (sg.kv(m, k+'.', v)));                                /* add the dot */
  };

  var seenInstances = {};
  const mapper = function(compoundRecord) {
    if (compoundRecord.Type !== 'A')                                            { return; }
    if (!compoundRecord.Name.toLowerCase().endsWith(argv.domain +'.'))          { return; }

    // TODO: Should find all instances, and get all their IPs
    var instance = assocInstance(fqdnDotInstances, compoundRecord.Name);

    if (!instance) {
      return 'DELETE';
    }

    if (instance.PublicIpAddress) {
      if (!compoundRecord.ips[instance.PublicIpAddress]) {
        // console.log(`iprec`, sg.inspect({instance, compoundRecord, ip: instance.PublicIpAddress, ips: compoundRecord.ips}));
        const delta   = mkIpDelta(instance.PublicIpAddress);     /* We have an instance with the record's fqdn, but the IPs dont match - change it */
        return handled(delta);
      }
      return handled();
    }

    if (instance.state !== 'running') {
      return handled('DELETE');
    }

    function handled(result) {
      seenInstances[instance.InstanceId] = instance.InstanceId;
      return result;
    }
  };

  var resultA = await changeDns(argv, context, initialSync, mapper, function({HostedZoneId, ChangeBatch}) {
    _.each(ipInstances, instance => {
      // console.log(`instance with ip`, instance[0].InstanceId, instance[0].PublicIpAddress, instance[0].tag_qn_fqdns, argv.domain);
      if (instance[0].InstanceId in seenInstances)    { return; }
      if (!instance[0].tag_qn_fqdns)                  { return; }
      let fqdn = instance[0].tag_qn_fqdns;
      if (!fqdn.endsWith(argv.domain))                { return; }

      // console.log(`unhandled instance with ip`, instance[0].InstanceId, instance[0].PublicIpAddress, instance[0].tag_qn_fqdns);

      var ResourceRecordSet = {
        Name: instance[0].tag_qn_fqdns +'.',
        Type: 'A',
        TTL: 30,
        ResourceRecords: [ { Value: instance[0].PublicIpAddress } ]
      };

      let theChange = {
        Action: "UPSERT",
        ResourceRecordSet,
      };

      // console.log(`${i} qm(`, sg.inspect({existing: compoundRecords[i], change, theChange}));
      ChangeBatch.Changes.push(theChange);
    });

    return ChangeBatch;
  });

  return resultA;

  // ==========================================================================================================================
  // var changes = compoundRecords.map(compoundRecord => {
  // });
}}));


// ----------------------------------------------------------------------------------------------------------------------------
async function changeDns(argv, context, initialSync, mapper, callback) {
  var records;

  if (!argv.json) {
    const P_records   = getAllRecords(argv, context);
    [records]         = [await P_records];
  } else {
    [records]     = [argv.json.records];
  }

  var HostedZoneId        = records.reduce((m, record) => (m || record.ResourceRecordSet.Name.endsWith(argv.domain +'.') && record.HostedZoneId), null);
  var compoundRecords     = records.map(record => ({record, Name:record.ResourceRecordSet.Name, Type:record.ResourceRecordSet.Type, ips: recordSetIps(record)}));

  if (initialSync) {
    await initialSync();
  }

  var changes = compoundRecords.map(compoundRecord => {
    return mapper(compoundRecord);
  });

  // console.log(`changes`, {changes});

  var ChangeBatch = {Changes:[]};

  _.each(changes, (change, i) => {
    if (!change) { return; }

    if (typeof change === 'string') {
      let theChange = {
        Action: change,
        ResourceRecordSet: compoundRecords[i].record.ResourceRecordSet,
      };

      // console.log(`${i} `, sg.inspect({change, compoundRecord: compoundRecords[i], theChange}));
      ChangeBatch.Changes.push(theChange);
      return;
    }

    var ResourceRecordSet = mergeRrs(compoundRecords[i].record, change);
    let theChange = {
      Action: "UPSERT",
      ResourceRecordSet,
    };

    // console.log(`${i} qm(`, sg.inspect({existing: compoundRecords[i], change, theChange}));
    ChangeBatch.Changes.push(theChange);
  });

  ChangeBatch = callback({HostedZoneId, ChangeBatch});
  // console.log(`changeResourceRecordSets`, sg.inspect({HostedZoneId, ChangeBatch}));

  // Finally, make the change
  var ChangeInfo, rest;
  if (ChangeBatch.Changes.length > 0) {
    if (!argv.dry_run) {
      ({ChangeInfo, ...rest} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise());
      dg.i(`To wait for the change to propigate:\n\n  aws route53 wait resource-record-sets-changed --id ${(ChangeInfo ||{}).Id}\n`);
    }
  } else {
    dg.i(`No changes need to be made`);
  }

  if (argv.verbose) {
    console.error(`changeResourceRecordSets`, sg.inspect({rest, HostedZoneId, ChangeBatch, ChangeInfo}));
  }

  return {HostedZoneId, ChangeBatch, ChangeInfo};
}

// =============================================================================================
mod.async(DIAG.async({resetDnsToCurrentX: async function(argv, context) {
  const diag    = DIAG.diagnostic({argv, context});

  // Get the request for instance list going
  const P_instances = ec2.describeInstances({}).promise();
  const P_records   = getAllRecords(argv, context);

  // Wait for both
  var [instances, records] = [normalizeItems(await P_instances).Instances, await P_records];
  var doneInstances = instances.map(x => false);

  var domainZoneId;

  var deletes = [];
  var changes = [];
  records.forEach(({ResourceRecordSet, HostedZoneId}) => {

    if (ResourceRecordSet.Name && ResourceRecordSet.Name.toLowerCase().endsWith(`${argv.domain}.`)) {
      domainZoneId = HostedZoneId;
    }

    if (ResourceRecordSet.Type === 'A') {

      var rrHandled = false;
      _.each(instances, (instance, index) => {
        console.log(`fixdns`, [instance.tag_qn_fqdns, ResourceRecordSet.Name], ResourceRecordSet.ResourceRecords, {HostedZoneId, ResourceRecordSet, instance});

        if (`${instance.tag_qn_fqdns}.` === ResourceRecordSet.Name) {
          if (instance.state !== 'running') {
            console.log(`delete ${instance.tag_qn_fqdns}`, JSON.stringify(ResourceRecordSet));
            deletes.push({ResourceRecordSet, HostedZoneId});
          } else {
            // It is running. Is it the right IP?
            if (instance.PublicIpAddress !== ResourceRecordSet.ResourceRecords[0].Value) {
              console.log(`Fix IP ${instance.tag_qn_fqdns} should be ${instance.PublicIpAddress}`, JSON.stringify(ResourceRecordSet));
              changes.push([{ResourceRecordSet, HostedZoneId}, instance.PublicIpAddress]);
            }
          }

          // We have taken care of this fqdn
          doneInstances[index] = true;
          rrHandled = true;
        }
      });

      // It is not claimed
      if (!rrHandled && ResourceRecordSet.Name && ResourceRecordSet.Name.toLowerCase().endsWith(`${argv.domain}.`)) {
        console.log(`Fixing DNS: Found record set without any instance for FQDN ${ResourceRecordSet.Name}`);
        deletes.push({ResourceRecordSet, HostedZoneId});
      }
    }
  });

  // Loop over any unhandled instances
  _.each(instances, (instance, index) => {
    if (!doneInstances[index] && instance.tag_qn_fqdns) {
      console.log(`Fixing DNS: Found instance with a claim for FQDN ${instance.tag_qn_fqdns}, but no Route 53 entry ${instance.id}(${instance.state})`);
      if (instance.state === 'running') {
        const ResourceRecordSet = {Name: instance.tag_qn_fqdns, ResourceRecords: [{Value:instance.PublicIpAddress}], TTL:300, Type: "A"};
        changes.push([{ResourceRecordSet, HostedZoneId: domainZoneId}, instance.PublicIpAddress]);
      }
    }
  });

  var report = [];

  // Delete?
  deletes.map(async (rrs) => {
    var HostedZoneId = rrs.HostedZoneId;
    var ChangeBatch = {Changes:[{Action:"DELETE", ResourceRecordSet : rrs.ResourceRecordSet}]};

    console.log(`Fixing DNS`, sg.inspect({ChangeBatch, HostedZoneId}));
    var {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();
    console.log(`Fixing DNS - Delete`, {ChangeBatch, HostedZoneId, ChangeInfo});

    report.push({delete:{ResourceRecordSet : rrs.ResourceRecordSet}});
  });

  // Update?
  changes.map(async ([rrs, ip]) => {
    var HostedZoneId      = rrs.HostedZoneId;
    var ResourceRecordSet = rrs.ResourceRecordSet;
    ResourceRecordSet.ResourceRecords[0].Value = ip;
    var ChangeBatch = {Changes:[{Action:"UPSERT", ResourceRecordSet}]};

    console.log(`Fixing DNS`, sg.inspect({ChangeBatch, HostedZoneId}));
    var {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();
    console.log(`Fixing DNS - Upsert`, {ChangeBatch, HostedZoneId, ChangeInfo});

    report.push({upsert:{ResourceRecordSet : rrs.ResourceRecordSet}});
  });

  return report;
}}));


module.exports.ra_active_fn_name = DIAG.activeName;

if (require.main === module) {
  (async function() {
    const {domain ='cdr0.net', ...rest}    = ARGV;
    // const json = getSample3();
    const json = null;
    // const bast = JSON.parse(JSON.stringify(json.records[3]));
    // bast.ResourceRecords = [];
    // json.records.push(qm(bast, {ResourceRecords:[{Value:'1.2.3.4'}]}));
    module.exports.resetDnsToCurrent({domain, json, ...rest}, {}, function(err, data) {
      console.log(`reset-to-current-state`, sg.inspect({err, data}));
    });
  })();
}

function getSample1() {
  return {"records":[{"ResourceRecordSet":{"Name":"cdr0.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-4.awsdns-00.com."},{"Value":"ns-589.awsdns-09.net."},{"Value":"ns-1713.awsdns-22.co.uk."},{"Value":"ns-1167.awsdns-17.org."}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"cdr0.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-4.awsdns-00.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"api.cdr0.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"3.228.23.122"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"bastion.cdr0.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"3.227.232.140"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"coder-zero.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-58.awsdns-07.com."},{"Value":"ns-1679.awsdns-17.co.uk."},{"Value":"ns-1306.awsdns-35.org."},{"Value":"ns-870.awsdns-44.net."}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"coder-zero.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-58.awsdns-07.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"api.coder-zero.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"34.205.177.222"}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"donotzero.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-1714.awsdns-22.co.uk."},{"Value":"ns-1214.awsdns-23.org."},{"Value":"ns-311.awsdns-38.com."},{"Value":"ns-744.awsdns-29.net."}]},"HostedZoneId":"/hostedzone/Z2BCW5FHP81EJD"},{"ResourceRecordSet":{"Name":"donotzero.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-1714.awsdns-22.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z2BCW5FHP81EJD"},{"ResourceRecordSet":{"Name":"netlabstats.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-431.awsdns-53.com."},{"Value":"ns-1170.awsdns-18.org."},{"Value":"ns-1769.awsdns-29.co.uk."},{"Value":"ns-723.awsdns-26.net."}]},"HostedZoneId":"/hostedzone/Z2IDZKUKWB140Y"},{"ResourceRecordSet":{"Name":"netlabstats.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-431.awsdns-53.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z2IDZKUKWB140Y"}],"instances":[{"AmiLaunchIndex":0,"ImageId":"ami-092546daafcc8bc0d","InstanceId":"i-0fcf954183ab1b713","InstanceType":"t3.nano","KeyName":"bcsnet-access","LaunchTime":"2019-11-29T19:38:14.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"us-east-1d","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41","ProductCodes":[],"PublicDnsName":"","State":{"Code":80,"Name":"stopped"},"StateTransitionReason":"User initiated (2019-11-30 06:49:43 GMT)","SubnetId":"subnet-016e68e6db0d35512","VpcId":"vpc-0eae06f7d3920fceb","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/sda1","Ebs":{"AttachTime":"2019-10-23T08:03:05.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-028bd08b719ba2281"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","IamInstanceProfile":{"Arn":"arn:aws:iam::108906662218:instance-profile/bcsnet-access-instance-role","Id":"AIPARSW2XZFFCPUUTW2C7"},"ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Attachment":{"AttachTime":"2019-10-23T08:03:04.000Z","AttachmentId":"eni-attach-0d86daac1bb715c6d","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"access","GroupId":"sg-0b5628494f326cffc"}],"Ipv6Addresses":[],"MacAddress":"02:41:6d:81:74:63","NetworkInterfaceId":"eni-0bb4f7a5569a08f7f","OwnerId":"108906662218","PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41","PrivateIpAddresses":[{"Primary":true,"PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41"}],"SourceDestCheck":false,"Status":"in-use","SubnetId":"subnet-016e68e6db0d35512","VpcId":"vpc-0eae06f7d3920fceb","InterfaceType":"interface"}],"RootDeviceName":"/dev/sda1","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"access","GroupId":"sg-0b5628494f326cffc"}],"SourceDestCheck":false,"StateReason":{"Code":"Client.UserInitiatedShutdown","Message":"Client.UserInitiatedShutdown: User initiated shutdown"},"Tags":[{"Key":"Name","Value":"NATInst-zoneD-13"},{"Key":"qn:roles","Value":":bastion:nat:"},{"Key":"qn:uniqueName","Value":"NATInst-zoneD-13"},{"Key":"realm","Value":"quicknet"},{"Key":"qn:fqdns","Value":"bastion.cdr0.net"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":2},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[],"tag_name":"NATInst-zoneD-13","tag_name__NATInst_zoneD_13":true,"tag_qn_roles":":bastion:nat:","tag_qn_roles__bastion":true,"tag_qn_roles__nat":true,"tag_qn_uniquename":"NATInst-zoneD-13","tag_qn_uniquename__NATInst_zoneD_13":true,"tag_realm":"quicknet","tag_realm__quicknet":true,"tag_qn_fqdns":"bastion.cdr0.net","tag_qn_fqdns__bastion_cdr0_net":true,"instanceId":"i-0fcf954183ab1b713","id":"i-0fcf954183ab1b713","monitoring":"disabled","zone":"us-east-1d","state":"stopped","iamInstanceProfile":"bcsnet-access-instance-role"},{"AmiLaunchIndex":0,"ImageId":"ami-0ec539abc2ecc4e85","InstanceId":"i-0e2bf32062fedc51a","InstanceType":"t3.micro","KeyName":"mario_demo","LaunchTime":"2019-11-29T19:38:14.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"us-east-1d","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167","ProductCodes":[],"PublicDnsName":"","State":{"Code":80,"Name":"stopped"},"StateTransitionReason":"User initiated (2019-11-30 06:49:43 GMT)","SubnetId":"subnet-0893a8472d1918392","VpcId":"vpc-0eae06f7d3920fceb","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/sda1","Ebs":{"AttachTime":"2019-11-05T09:28:57.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-0c4aa851c2a4c587d"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","IamInstanceProfile":{"Arn":"arn:aws:iam::108906662218:instance-profile/bcsnet-db-instance-role","Id":"AIPARSW2XZFFOJYMIEYXT"},"ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Attachment":{"AttachTime":"2019-11-05T09:28:56.000Z","AttachmentId":"eni-attach-0737250bed01cf083","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"util","GroupId":"sg-0b5700cf69a472e42"},{"GroupName":"db","GroupId":"sg-010b08d4c2b58deca"}],"Ipv6Addresses":[],"MacAddress":"02:5e:70:fa:38:5f","NetworkInterfaceId":"eni-0ab1a7f20d9108d0c","OwnerId":"108906662218","PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167","PrivateIpAddresses":[{"Primary":true,"PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167"}],"SourceDestCheck":false,"Status":"in-use","SubnetId":"subnet-0893a8472d1918392","VpcId":"vpc-0eae06f7d3920fceb","InterfaceType":"interface"}],"RootDeviceName":"/dev/sda1","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"util","GroupId":"sg-0b5700cf69a472e42"},{"GroupName":"db","GroupId":"sg-010b08d4c2b58deca"}],"SourceDestCheck":false,"StateReason":{"Code":"Client.UserInitiatedShutdown","Message":"Client.UserInitiatedShutdown: User initiated shutdown"},"Tags":[{"Key":"Name","Value":"db"},{"Key":"realm","Value":"quicknet"},{"Key":"qn:roles","Value":":db:mongo:nosql:redis:"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":2},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[],"tag_name":"db","tag_name__db":true,"tag_realm":"quicknet","tag_realm__quicknet":true,"tag_qn_roles":":db:mongo:nosql:redis:","tag_qn_roles__db":true,"tag_qn_roles__mongo":true,"tag_qn_roles__nosql":true,"tag_qn_roles__redis":true,"instanceId":"i-0e2bf32062fedc51a","id":"i-0e2bf32062fedc51a","monitoring":"disabled","zone":"us-east-1d","state":"stopped","iamInstanceProfile":"bcsnet-db-instance-role"}]};
}

function getSample2() {
  return {"records":[{"ResourceRecordSet":{"Name":"cdr0.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-4.awsdns-00.com."},{"Value":"ns-589.awsdns-09.net."},{"Value":"ns-1713.awsdns-22.co.uk."},{"Value":"ns-1167.awsdns-17.org."}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"cdr0.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-4.awsdns-00.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"api.cdr0.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"3.228.23.122"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"bastion.cdr0.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"3.227.232.140"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"coder-zero.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-58.awsdns-07.com."},{"Value":"ns-1679.awsdns-17.co.uk."},{"Value":"ns-1306.awsdns-35.org."},{"Value":"ns-870.awsdns-44.net."}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"coder-zero.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-58.awsdns-07.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"api.coder-zero.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"34.205.177.222"}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"donotzero.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-1714.awsdns-22.co.uk."},{"Value":"ns-1214.awsdns-23.org."},{"Value":"ns-311.awsdns-38.com."},{"Value":"ns-744.awsdns-29.net."}]},"HostedZoneId":"/hostedzone/Z2BCW5FHP81EJD"},{"ResourceRecordSet":{"Name":"donotzero.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-1714.awsdns-22.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z2BCW5FHP81EJD"},{"ResourceRecordSet":{"Name":"netlabstats.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-431.awsdns-53.com."},{"Value":"ns-1170.awsdns-18.org."},{"Value":"ns-1769.awsdns-29.co.uk."},{"Value":"ns-723.awsdns-26.net."}]},"HostedZoneId":"/hostedzone/Z2IDZKUKWB140Y"},{"ResourceRecordSet":{"Name":"netlabstats.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-431.awsdns-53.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z2IDZKUKWB140Y"}],"instances":[{"AmiLaunchIndex":0,"ImageId":"ami-092546daafcc8bc0d","InstanceId":"i-0fcf954183ab1b713","InstanceType":"t3.nano","KeyName":"bcsnet-access","LaunchTime":"2019-12-01T06:48:15.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"us-east-1d","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41","ProductCodes":[],"PublicDnsName":"ec2-18-209-212-46.compute-1.amazonaws.com","PublicIpAddress":"18.209.212.46","State":{"Code":16,"Name":"running"},"StateTransitionReason":"","SubnetId":"subnet-016e68e6db0d35512","VpcId":"vpc-0eae06f7d3920fceb","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/sda1","Ebs":{"AttachTime":"2019-10-23T08:03:05.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-028bd08b719ba2281"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","IamInstanceProfile":{"Arn":"arn:aws:iam::108906662218:instance-profile/bcsnet-access-instance-role","Id":"AIPARSW2XZFFCPUUTW2C7"},"ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Association":{"IpOwnerId":"amazon","PublicDnsName":"ec2-18-209-212-46.compute-1.amazonaws.com","PublicIp":"18.209.212.46"},"Attachment":{"AttachTime":"2019-10-23T08:03:04.000Z","AttachmentId":"eni-attach-0d86daac1bb715c6d","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"access","GroupId":"sg-0b5628494f326cffc"}],"Ipv6Addresses":[],"MacAddress":"02:41:6d:81:74:63","NetworkInterfaceId":"eni-0bb4f7a5569a08f7f","OwnerId":"108906662218","PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41","PrivateIpAddresses":[{"Association":{"IpOwnerId":"amazon","PublicDnsName":"ec2-18-209-212-46.compute-1.amazonaws.com","PublicIp":"18.209.212.46"},"Primary":true,"PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41"}],"SourceDestCheck":false,"Status":"in-use","SubnetId":"subnet-016e68e6db0d35512","VpcId":"vpc-0eae06f7d3920fceb","InterfaceType":"interface"}],"RootDeviceName":"/dev/sda1","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"access","GroupId":"sg-0b5628494f326cffc"}],"SourceDestCheck":false,"Tags":[{"Key":"Name","Value":"NATInst-zoneD-13"},{"Key":"qn:roles","Value":":bastion:nat:"},{"Key":"qn:uniqueName","Value":"NATInst-zoneD-13"},{"Key":"realm","Value":"quicknet"},{"Key":"qn:fqdns","Value":"bastion.cdr0.net"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":2},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[],"tag_name":"NATInst-zoneD-13","tag_name__NATInst_zoneD_13":true,"tag_qn_roles":":bastion:nat:","tag_qn_roles__bastion":true,"tag_qn_roles__nat":true,"tag_qn_uniquename":"NATInst-zoneD-13","tag_qn_uniquename__NATInst_zoneD_13":true,"tag_realm":"quicknet","tag_realm__quicknet":true,"tag_qn_fqdns":"bastion.cdr0.net","tag_qn_fqdns__bastion_cdr0_net":true,"instanceId":"i-0fcf954183ab1b713","id":"i-0fcf954183ab1b713","monitoring":"disabled","zone":"us-east-1d","state":"running","iamInstanceProfile":"bcsnet-access-instance-role"},{"AmiLaunchIndex":0,"ImageId":"ami-0ec539abc2ecc4e85","InstanceId":"i-0e2bf32062fedc51a","InstanceType":"t3.micro","KeyName":"mario_demo","LaunchTime":"2019-12-01T06:48:15.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"us-east-1d","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167","ProductCodes":[],"PublicDnsName":"","State":{"Code":16,"Name":"running"},"StateTransitionReason":"","SubnetId":"subnet-0893a8472d1918392","VpcId":"vpc-0eae06f7d3920fceb","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/sda1","Ebs":{"AttachTime":"2019-11-05T09:28:57.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-0c4aa851c2a4c587d"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","IamInstanceProfile":{"Arn":"arn:aws:iam::108906662218:instance-profile/bcsnet-db-instance-role","Id":"AIPARSW2XZFFOJYMIEYXT"},"ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Attachment":{"AttachTime":"2019-11-05T09:28:56.000Z","AttachmentId":"eni-attach-0737250bed01cf083","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"util","GroupId":"sg-0b5700cf69a472e42"},{"GroupName":"db","GroupId":"sg-010b08d4c2b58deca"}],"Ipv6Addresses":[],"MacAddress":"02:5e:70:fa:38:5f","NetworkInterfaceId":"eni-0ab1a7f20d9108d0c","OwnerId":"108906662218","PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167","PrivateIpAddresses":[{"Primary":true,"PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167"}],"SourceDestCheck":false,"Status":"in-use","SubnetId":"subnet-0893a8472d1918392","VpcId":"vpc-0eae06f7d3920fceb","InterfaceType":"interface"}],"RootDeviceName":"/dev/sda1","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"util","GroupId":"sg-0b5700cf69a472e42"},{"GroupName":"db","GroupId":"sg-010b08d4c2b58deca"}],"SourceDestCheck":false,"Tags":[{"Key":"Name","Value":"db"},{"Key":"realm","Value":"quicknet"},{"Key":"qn:roles","Value":":db:mongo:nosql:redis:"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":2},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[],"tag_name":"db","tag_name__db":true,"tag_realm":"quicknet","tag_realm__quicknet":true,"tag_qn_roles":":db:mongo:nosql:redis:","tag_qn_roles__db":true,"tag_qn_roles__mongo":true,"tag_qn_roles__nosql":true,"tag_qn_roles__redis":true,"instanceId":"i-0e2bf32062fedc51a","id":"i-0e2bf32062fedc51a","monitoring":"disabled","zone":"us-east-1d","state":"running","iamInstanceProfile":"bcsnet-db-instance-role"}]};
}

function getSample3() {
  return {"records":[{"ResourceRecordSet":{"Name":"cdr0.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-4.awsdns-00.com."},{"Value":"ns-589.awsdns-09.net."},{"Value":"ns-1713.awsdns-22.co.uk."},{"Value":"ns-1167.awsdns-17.org."}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"cdr0.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-4.awsdns-00.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"xapi.cdr0.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"3.228.23.122"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"bastionx.cdr0.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"3.227.232.140"}]},"HostedZoneId":"/hostedzone/ZGFBEAK36D73U"},{"ResourceRecordSet":{"Name":"coder-zero.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-58.awsdns-07.com."},{"Value":"ns-1679.awsdns-17.co.uk."},{"Value":"ns-1306.awsdns-35.org."},{"Value":"ns-870.awsdns-44.net."}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"coder-zero.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-58.awsdns-07.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"api.coder-zero.net.","Type":"A","TTL":300,"ResourceRecords":[{"Value":"34.205.177.222"}]},"HostedZoneId":"/hostedzone/Z3AFU2COQC5A6A"},{"ResourceRecordSet":{"Name":"donotzero.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-1714.awsdns-22.co.uk."},{"Value":"ns-1214.awsdns-23.org."},{"Value":"ns-311.awsdns-38.com."},{"Value":"ns-744.awsdns-29.net."}]},"HostedZoneId":"/hostedzone/Z2BCW5FHP81EJD"},{"ResourceRecordSet":{"Name":"donotzero.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-1714.awsdns-22.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z2BCW5FHP81EJD"},{"ResourceRecordSet":{"Name":"netlabstats.net.","Type":"NS","TTL":172800,"ResourceRecords":[{"Value":"ns-431.awsdns-53.com."},{"Value":"ns-1170.awsdns-18.org."},{"Value":"ns-1769.awsdns-29.co.uk."},{"Value":"ns-723.awsdns-26.net."}]},"HostedZoneId":"/hostedzone/Z2IDZKUKWB140Y"},{"ResourceRecordSet":{"Name":"netlabstats.net.","Type":"SOA","TTL":900,"ResourceRecords":[{"Value":"ns-431.awsdns-53.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"}]},"HostedZoneId":"/hostedzone/Z2IDZKUKWB140Y"}],"instances":[{"AmiLaunchIndex":0,"ImageId":"ami-092546daafcc8bc0d","InstanceId":"i-0fcf954183ab1b713","InstanceType":"t3.nano","KeyName":"bcsnet-access","LaunchTime":"2019-12-01T06:48:15.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"us-east-1d","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41","ProductCodes":[],"PublicDnsName":"ec2-18-209-212-46.compute-1.amazonaws.com","PublicIpAddress":"18.209.212.46","State":{"Code":16,"Name":"running"},"StateTransitionReason":"","SubnetId":"subnet-016e68e6db0d35512","VpcId":"vpc-0eae06f7d3920fceb","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/sda1","Ebs":{"AttachTime":"2019-10-23T08:03:05.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-028bd08b719ba2281"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","IamInstanceProfile":{"Arn":"arn:aws:iam::108906662218:instance-profile/bcsnet-access-instance-role","Id":"AIPARSW2XZFFCPUUTW2C7"},"ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Association":{"IpOwnerId":"amazon","PublicDnsName":"ec2-18-209-212-46.compute-1.amazonaws.com","PublicIp":"18.209.212.46"},"Attachment":{"AttachTime":"2019-10-23T08:03:04.000Z","AttachmentId":"eni-attach-0d86daac1bb715c6d","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"access","GroupId":"sg-0b5628494f326cffc"}],"Ipv6Addresses":[],"MacAddress":"02:41:6d:81:74:63","NetworkInterfaceId":"eni-0bb4f7a5569a08f7f","OwnerId":"108906662218","PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41","PrivateIpAddresses":[{"Association":{"IpOwnerId":"amazon","PublicDnsName":"ec2-18-209-212-46.compute-1.amazonaws.com","PublicIp":"18.209.212.46"},"Primary":true,"PrivateDnsName":"ip-10-13-48-41.ec2.internal","PrivateIpAddress":"10.13.48.41"}],"SourceDestCheck":false,"Status":"in-use","SubnetId":"subnet-016e68e6db0d35512","VpcId":"vpc-0eae06f7d3920fceb","InterfaceType":"interface"}],"RootDeviceName":"/dev/sda1","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"access","GroupId":"sg-0b5628494f326cffc"}],"SourceDestCheck":false,"Tags":[{"Key":"Name","Value":"NATInst-zoneD-13"},{"Key":"qn:roles","Value":":bastion:nat:"},{"Key":"qn:uniqueName","Value":"NATInst-zoneD-13"},{"Key":"realm","Value":"quicknet"},{"Key":"qn:fqdns","Value":"bastion.cdr0.net"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":2},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[],"tag_name":"NATInst-zoneD-13","tag_name__NATInst_zoneD_13":true,"tag_qn_roles":":bastion:nat:","tag_qn_roles__bastion":true,"tag_qn_roles__nat":true,"tag_qn_uniquename":"NATInst-zoneD-13","tag_qn_uniquename__NATInst_zoneD_13":true,"tag_realm":"quicknet","tag_realm__quicknet":true,"tag_qn_fqdns":"bastion.cdr0.net","tag_qn_fqdns__bastion_cdr0_net":true,"instanceId":"i-0fcf954183ab1b713","id":"i-0fcf954183ab1b713","monitoring":"disabled","zone":"us-east-1d","state":"running","iamInstanceProfile":"bcsnet-access-instance-role"},{"AmiLaunchIndex":0,"ImageId":"ami-0ec539abc2ecc4e85","InstanceId":"i-0e2bf32062fedc51a","InstanceType":"t3.micro","KeyName":"mario_demo","LaunchTime":"2019-12-01T06:48:15.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"us-east-1d","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167","ProductCodes":[],"PublicDnsName":"","State":{"Code":16,"Name":"running"},"StateTransitionReason":"","SubnetId":"subnet-0893a8472d1918392","VpcId":"vpc-0eae06f7d3920fceb","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/sda1","Ebs":{"AttachTime":"2019-11-05T09:28:57.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-0c4aa851c2a4c587d"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","IamInstanceProfile":{"Arn":"arn:aws:iam::108906662218:instance-profile/bcsnet-db-instance-role","Id":"AIPARSW2XZFFOJYMIEYXT"},"ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Attachment":{"AttachTime":"2019-11-05T09:28:56.000Z","AttachmentId":"eni-attach-0737250bed01cf083","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"util","GroupId":"sg-0b5700cf69a472e42"},{"GroupName":"db","GroupId":"sg-010b08d4c2b58deca"}],"Ipv6Addresses":[],"MacAddress":"02:5e:70:fa:38:5f","NetworkInterfaceId":"eni-0ab1a7f20d9108d0c","OwnerId":"108906662218","PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167","PrivateIpAddresses":[{"Primary":true,"PrivateDnsName":"ip-10-13-54-167.ec2.internal","PrivateIpAddress":"10.13.54.167"}],"SourceDestCheck":false,"Status":"in-use","SubnetId":"subnet-0893a8472d1918392","VpcId":"vpc-0eae06f7d3920fceb","InterfaceType":"interface"}],"RootDeviceName":"/dev/sda1","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"util","GroupId":"sg-0b5700cf69a472e42"},{"GroupName":"db","GroupId":"sg-010b08d4c2b58deca"}],"SourceDestCheck":false,"Tags":[{"Key":"Name","Value":"db"},{"Key":"realm","Value":"quicknet"},{"Key":"qn:roles","Value":":db:mongo:nosql:redis:"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":2},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[],"tag_name":"db","tag_name__db":true,"tag_realm":"quicknet","tag_realm__quicknet":true,"tag_qn_roles":":db:mongo:nosql:redis:","tag_qn_roles__db":true,"tag_qn_roles__mongo":true,"tag_qn_roles__nosql":true,"tag_qn_roles__redis":true,"instanceId":"i-0e2bf32062fedc51a","id":"i-0e2bf32062fedc51a","monitoring":"disabled","zone":"us-east-1d","state":"running","iamInstanceProfile":"bcsnet-db-instance-role"}]};
}

