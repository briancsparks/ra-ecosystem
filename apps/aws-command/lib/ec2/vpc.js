
/**
 * @file
 */

const _                       = require('lodash');
const sg                      = require('sg-flow');
const utils                   = require('../utils');
const ra                      = require('run-anywhere').v2;
const awsDefs                 = require('../aws-defs');
const AWS                     = require('aws-sdk');
const libTag                  = require('./tags');
const libAws                  = require('../aws');

const mod                     = ra.modSquad(module);

const awsFilters              = libAws.awsFilters;
const getTag                  = utils.getTag;
const mkTags                  = libTag.mkTags;

const tag                     = ra.load(libTag, 'tag');

const ec2 = libAws.awsService('EC2');

var lib = {};

const defaultTags = {
  Name: true,
  namespace: true,
  owner: true
};

// TODO: call modifySubnetAttribute ( MapPublicIpOnLaunch, AssignIpv6AddressOnCreation )
mod.xport({upsertSubnet: function(argv, context, callback) {
  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx;

  return fra.iwrap('awsCommand::upsertSubnet', function(abort, calling) {
    const { describeSubnets, createSubnet } = libAws.awsFns(ec2, 'describeSubnets,createSubnet', abort);

    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr', {required:true});
    const VpcId             = fra.arg(argv, 'VpcId,vpc', {required:true});
    const AvailabilityZone  = fra.arg(argv, 'AvailabilityZone,az', {required:true});

    if (fra.argErrors())    { return fra.abort(); }

    var   subnet;

    return sg.__run2({}, callback, [function(result, next, last) {
      // return next();

      return describeSubnets(awsFilters({cidr:[CidrBlock],"vpc-id":[VpcId]}), true, function(err, data) {

        console.log(`Found subnets`, {err, data});
        if (data.Subnets.length > 1) {
          return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.Subnets.length})`, debug:{subnets: data.Subnets}});
        }

        if (data.Subnets.length === 1) {         /* We found it */
          subnet = data.Subnets[0];
          result.result = {Subnet:subnet};
          return next();
        }

        return next();
      });

    }, function(result, next, last) {
      if (subnet)  { return next(); }    /* we already have it */

      return createSubnet({CidrBlock, AvailabilityZone, VpcId}, true, function(err, data) {

        subnet = data.Subnet;
        result.result = data;

        // Tag it
        return tag({id: subnet.SubnetId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(result, next) {
      return next();
    }]);
  });
}});

// TODO: call modifyVpcAttribute ( EnableDnsSupport, EnableDnsHostNames )
// See also modifyVpcEndpoint, modifyVpcEndpointConnectionNotification, modifyVpcEndpointServiceConfiguration, modifyVpcTenancy
mod.xport({upsertVpc: function(argv, context, callback) {

  return sg.iwrap('awsCommand::upsertVpc', callback, function(abort, calling) {
    const { describeVpcs, createVpc } = libAws.awsFns(ec2, 'describeVpcs,createVpc', abort);

    const classB            = +argv.classB;
    const CidrBlock         = argv.cidr;
    const InstanceTenancy   = 'default';

    const AmazonProvidedIpv6CidrBlock = true;

    if (!CidrBlock) {
      return abort({missing:'cidr'}, 'parsing params');
    }

    var   vpc;

    return sg.__run2({}, callback, [function(result, next, last) {

      return describeVpcs(awsFilters({cidr:[CidrBlock]}), function(err, data) {

        if (data.Vpcs.length > 1) {
          return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.Vpcs.length})`, debug:{vpcs: data.Vpcs}});
        }

        if (data.Vpcs.length === 1) {         /* We found it */
          vpc = data.Vpcs[0];
          result.result = {Vpc:vpc};
          return next();
        }

        return next();
      });

    }, function(result, next, last) {
      if (vpc)  { return next(); }    /* we already have it */

      return createVpc({CidrBlock, InstanceTenancy, AmazonProvidedIpv6CidrBlock}, function(err, data) {

        vpc = data.Vpc;
        result.result = data;

        // Tag it
        return tag({id: vpc.VpcId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(result, next) {
      return next();
    }]);
  });
}});


mod.xport({getSubnets: function(argv, context, callback) {

  const classB = argv.classB;
  const kind   = argv.kind ? argv.kind.toLowerCase() : argv.kind;

  var   allVpcs, allSubnets, allSecurityGroups;

  return sg.__runll([function(next) {

    return ec2.describeVpcs({}, function(err, data) {
      if (!sg.ok(err, data)) { return callback(err); }

      allVpcs = data.Vpcs;
      return next();
    });
  }, function(next) {

    return ec2.describeSecurityGroups({}, function(err, data) {
      if (!sg.ok(err, data)) { return callback(err); }

      allSecurityGroups = data.SecurityGroups;
      return next();
    });
  }, function(next) {

    return ec2.describeSubnets({}, function(err, data) {
      if (!sg.ok(err, data)) { return callback(err); }

      allSubnets = data.Subnets;
      return next();
    });
  }], function done() {

    var result = {};
    var vpcs = [], subnets = [], securityGroups = [];

    // Filter the VPCs by class B
    if (classB) {
      vpcs = sg.reduce(allVpcs || [], vpcs, function(m, vpc) {
        let parts = (vpc.CidrBlock || '').split(/[^0-9]+/);
        if (parts.length === 5 && parts[1] === classB) {
          return sg.ap(m, vpc);
        }
        return m;
      });
    }

    // Filter the subnets and SGs by the VPCs' IDs
    _.each(vpcs, function(vpc) {
      subnets = sg.reduce(allSubnets, subnets, function(m, subnet) {
        if (subnet.VpcId === vpc.VpcId) {

          if (!kind || getTag(subnet, 'aws:cloudformation:logical-id').toLowerCase().endsWith(kind)) {
            return sg.ap(m, subnet);
          }
        }
        return m;
      });

      securityGroups = sg.reduce(allSecurityGroups, securityGroups, function(m, securityGroup) {
        if (securityGroup.VpcId === vpc.VpcId) {
          const sgKind = getTag(securityGroup, 'aws:cloudformation:logical-id').toLowerCase();

          if (!kind || sgKind == 'sgwide' || (kind === 'public' && sgKind === 'sgweb')) {
            return sg.ap(m, securityGroup);
          }
        }
        return m;
      });

    });

    result.vpcs = vpcs;
    result.subnets = subnets;
    result.securityGroups = securityGroups;
    return callback(null, result);
  });

}});
