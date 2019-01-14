
/**
 * @file
 */

const _                       = require('lodash');
const sg                      = require('sg-flow');
const utils                   = require('../utils');
const ra                      = require('run-anywhere').v2;
const AWS                     = require('aws-sdk');

const mod                     = ra.modSquad(module);

const getTag                  = utils.getTag;

const ec2 = new AWS.EC2({region: 'us-east-1'});

var lib = {};

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
