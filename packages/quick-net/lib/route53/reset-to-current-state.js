
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



 // =============================================================================================
DIAG.usage({ aliases: { resetDnsToCurrent: { args: {
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--domain=cdr0.net --debug`);
DIAG.activeName = 'resetDnsToCurrent';

mod.async(DIAG.async({resetDnsToCurrent: async function(argv, context) {
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
        // console.log(`fixdns`, [instance.tag_qn_fqdns, ResourceRecordSet.Name], ResourceRecordSet.ResourceRecords, {HostedZoneId, ResourceRecordSet, instance});

        if (`${instance.tag_qn_fqdns}.` === ResourceRecordSet.Name) {
          if (instance.state !== 'running') {
            // console.log(`delete ${instance.tag_qn_fqdns}`, JSON.stringify(ResourceRecordSet));
            deletes.push({ResourceRecordSet, HostedZoneId});
          } else {
            // It is running. Is it the right IP?
            if (instance.PublicIpAddress !== ResourceRecordSet.ResourceRecords[0].Value) {
              // console.log(`Fix IP ${instance.tag_qn_fqdns} should be ${instance.PublicIpAddress}`, JSON.stringify(ResourceRecordSet));
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

    // console.log(`Fixing DNS`, sg.inspect({ChangeBatch, HostedZoneId}));
    var {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();
    // console.log(`Fixing DNS - Delete`, {ChangeBatch, HostedZoneId, ChangeInfo});

    report.push({delete:{ResourceRecordSet : rrs.ResourceRecordSet}});
  });

  // Update?
  changes.map(async ([rrs, ip]) => {
    var HostedZoneId      = rrs.HostedZoneId;
    var ResourceRecordSet = rrs.ResourceRecordSet;
    ResourceRecordSet.ResourceRecords[0].Value = ip;
    var ChangeBatch = {Changes:[{Action:"UPSERT", ResourceRecordSet}]};

    // console.log(`Fixing DNS`, sg.inspect({ChangeBatch, HostedZoneId}));
    var {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();
    // console.log(`Fixing DNS - Upsert`, {ChangeBatch, HostedZoneId, ChangeInfo});

    report.push({upsert:{ResourceRecordSet : rrs.ResourceRecordSet}});
  });

  return report;
}}));


module.exports.ra_active_fn_name = DIAG.activeName;

if (require.main === module) {
  const {domain ='cdr0.net'}    = ARGV;
  module.exports.resetDnsToCurrent({domain}, {}, function(err, data) {
    console.log(`reset-to-current-state`, sg.inspect({err, data}));
  });
}
