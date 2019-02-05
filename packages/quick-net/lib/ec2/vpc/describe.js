
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const libAws                  = require('../../aws');
const libCidr                 = require('../cidr');

const mod                     = ra.modSquad(module, 'vpcDescribe');
const ec2                     = libAws.awsService('EC2');

const {
  isVpcId,
  awsFilters
}                             = libAws;
const {
  isCidr
}                             = libCidr;

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//
mod.xport({describeVpcs: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc\describe.js describeVpcs --classB=
  // ra invoke packages\quick-net\lib\ec2\vpc\describe.js describeVpcs --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx.vpcDescribe__describeVpcs;

  return fra.iwrap(function(abort) {
    const { describeVpcs } = libAws.awsFns(ec2, 'describeVpcs', fra.opts({}), abort);

    const classB            = fra.arg(argv, 'classB,class-b');
    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr')    || (classB ? `10.${classB}.0.0/16` : argv.cidr);
    const VpcId             = fra.arg(argv, 'VpcId,vpc');
    const program           = fra.arg(argv, 'program');

    if (fra.argErrors())    { return fra.abort(); }

    var   query = {};
    if (VpcId) {
      query = {VpcIds:[VpcId]};

    } else if (CidrBlock) {
      query = awsFilters({cidr:[CidrBlock]});

    } else if (program) {
      query = awsFilters({"tag:program":[program]});
    }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeVpcs(query, fra.opts({}), function(err, data) {
        return callback(err, data);
      });
    }]);
  });
}});

mod.xport({describeSubnets: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc\describe.js describeSubnets --classB=
  // ra invoke packages\quick-net\lib\ec2\vpc\describe.js describeSubnets --subnet=

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx.vpcDescribe__describeSubnets;

  return fra.iwrap(function(abort) {
    const { describeSubnets } = libAws.awsFns(ec2, 'describeSubnets', fra.opts({}), abort);
    const { describeVpcs }    = fra.loads('describeVpcs', fra.opts({}), abort);

    var   classB            = fra.arg(argv, 'classB,class-b');
    const SubnetId          = fra.arg(argv, 'SubnetId,subnet');
    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr');
    var   VpcId             = fra.arg(argv, 'VpcId,vpc');

    if (fra.argErrors())              { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      // If we are given the subnet ID, just use it
      if (!SubnetId)                    { return next(); }

      return describeSubnets(awsFilters({"subnet-id":[SubnetId]}), function(err, data) {
        if (data.Subnets.length === 0)    { return next(); }

        return callback(err, data);
      });

    }, function(my, next) {

      // Do we have to figure out the VpcId?
      if (isVpcId(VpcId))               { return next(); }

      if (!classB) {
        classB = VpcId;
      }

      // Need to figure out class-b from cidr?
      if (!classB) {
        classB = CidrBlock.split(/[^0-9]+/)[1];
      }

      // Need to figure out VpcId
      return describeVpcs(fra.opts({classB}), fra.opts({}), function(err, data) {
        if (data.Vpcs.length === 0)    { return next(); }

        VpcId = data.Vpcs[0].VpcId;
        return next();
      });

    }, function(my, next) {
      if (!isVpcId(VpcId))              { return next(); }

      var   cidr;
      if (CidrBlock) {
        cidr = [CidrBlock];
      }

      return describeSubnets(awsFilters({cidr,"vpc-id":[VpcId]}), function(err, data) {
        return callback(err, data);
      });

    }, function(my, next) {
      return fra.abort(`ENOVPC`);
    }]);
  });
}});


// -------------------------------------------------------------------------------------
//  Helper Functions
//


