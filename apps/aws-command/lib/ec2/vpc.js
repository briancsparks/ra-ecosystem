
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

const debugAwsCalls           = true;
const skipAbort               = {abort:false, debug:debugAwsCalls};

const ec2 = libAws.awsService('EC2');

var lib = {};

const defaultTags = {
  Name: true,
  namespace: true,
  owner: true
};

mod.xport({upsertSecurityGroupIngress: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js upsertSecurityGroupIngress --cidr=10.0.0.0/8 --from=22 --to=22  --desc=from-wide-group  --id=sg-

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx;

  return fra.iwrap('awsCommand::upsertSecurityGroupIngress', function(abort, calling) {
    const { authorizeSecurityGroupIngress } = libAws.awsFns(ec2, 'authorizeSecurityGroupIngress', abort);

    const GroupId           = fra.arg(argv, 'GroupId,id', {required:true});
    const IpProtocol        = fra.arg(argv, 'protocol,proto', {required:false, def: 'tcp'});
    const CidrIp            = fra.arg(argv, 'CidrIp,cidr', {required:true});
    const FromPort          = fra.arg(argv, 'FromPort,from', {required:true});
    const ToPort            = fra.arg(argv, 'ToPort,to', {required:true});
    const Description       = fra.arg(argv, 'Description,desc', {required:false});

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      const IpRanges        = [{CidrIp, Description}];
      const IpPermissions   = [{IpProtocol, FromPort, ToPort, IpRanges}];
      const params          = {GroupId, IpPermissions};

      calling('AWS::authorizeSecurityGroupIngress', params);
      return ec2.authorizeSecurityGroupIngress(params, function(err, data) {
        if (debugAwsCalls)    { console.log(`AWS::authorizeSecurityGroupIngress()`, sg.inspect({params, err, data})); }

        if (err) {
          if (err.code === 'InvalidPermission.Duplicate') {
            my.result = {};
            return next();

          } else {
            return abort(err);
          }
        }

        my.result = data;
        return next();
      });
    }]);
  });
}});


mod.xport({upsertSecurityGroup: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js upsertSecurityGroup --name=wide --desc=wide-group --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx;

  return fra.iwrap('awsCommand::upsertSecurityGroup', function(abort, calling) {
    const { describeSecurityGroups, createSecurityGroup } = libAws.awsFns(ec2, 'describeSecurityGroups,createSecurityGroup', abort);

    const VpcId             = fra.arg(argv, 'VpcId,vpc', {required:true});
    const GroupName         = fra.arg(argv, 'GroupName,name', {required:true});
    const Description       = fra.arg(argv, 'Description,desc', {required:false});

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      // return next();

      return describeSecurityGroups(awsFilters({"vpc-id":[VpcId],"group-name":[GroupName]}), debugAwsCalls, function(err, data) {

        if (data.SecurityGroups.length === 0)    { return next(); }
        if (data.SecurityGroups.length > 1)      { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.SecurityGroups.length})`, debug:{sgs: data.SecurityGroups}}); }

        /* We found it */
        my.result = {SecurityGroup: data.SecurityGroups[0]};
        return next();
      });

    }, function(my, next, last) {
      if (my.result.SecurityGroup)  { return next(); }    /* we already have it */

      return createSecurityGroup({VpcId, GroupName, Description}, debugAwsCalls, function(err, data) {

        my.result = data;

        // Tag it
        return tag({type:'SecurityGroup', id: my.result.GroupId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
      return next();
    }]);
  });
}});

// TODO: call modifySubnetAttribute ( MapPublicIpOnLaunch, AssignIpv6AddressOnCreation )
mod.xport({upsertSubnet: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js upsertSubnet --cidr=10.111.0.0/20 --az=us-east-1a --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx;

  return fra.iwrap('awsCommand::upsertSubnet', function(abort, calling) {
    const { describeSubnets, createSubnet } = libAws.awsFns(ec2, 'describeSubnets,createSubnet', abort);

    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr', {required:true});
    const VpcId             = fra.arg(argv, 'VpcId,vpc', {required:true});
    const AvailabilityZone  = fra.arg(argv, 'AvailabilityZone,az', {required:true});

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeSubnets(awsFilters({cidr:[CidrBlock],"vpc-id":[VpcId]}), debugAwsCalls, function(err, data) {

        if (data.Subnets.length === 0)    { return next(); }
        if (data.Subnets.length > 1)      { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.Subnets.length})`, debug:{subnets: data.Subnets}}); }

        /* We found it */
        my.result = {Subnet: data.Subnets[0]};
        return next();
      });

    }, function(my, next, last) {
      if (my.result.Subnet)  { return next(); }    /* we already have it */

      return createSubnet({CidrBlock, AvailabilityZone, VpcId}, debugAwsCalls, function(err, data) {

        my.result = data;

        // Tag it
        return tag({type:'Subnet', id: my.result.Subnet.SubnetId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
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
    const CidrBlock         = argv.cidr    || classB ? `10.${classB}.0.0/16` : argv.cidr;
    const InstanceTenancy   = 'default';

    const AmazonProvidedIpv6CidrBlock = true;

    if (!CidrBlock) {
      return abort({missing:'cidr'}, 'parsing params');
    }

    var   vpc;

    return sg.__run2({}, callback, [function(my, next, last) {

      return describeVpcs(awsFilters({cidr:[CidrBlock]}), function(err, data) {

        if (data.Vpcs.length > 1) {
          return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.Vpcs.length})`, debug:{vpcs: data.Vpcs}});
        }

        if (data.Vpcs.length === 1) {         /* We found it */
          vpc = data.Vpcs[0];
          my.result = {Vpc:vpc};
          return next();
        }

        return next();
      });

    }, function(my, next, last) {
      if (vpc)  { return next(); }    /* we already have it */

      return createVpc({CidrBlock, InstanceTenancy, AmazonProvidedIpv6CidrBlock}, function(err, data) {

        vpc = data.Vpc;
        my.result = data;

        // Tag it
        return tag({type:'Vpc', id: vpc.VpcId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
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


mod.xport({allocateAddress: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js allocateAddress

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx;

  return fra.iwrap('awsCommand::allocateAddress', function(abort, calling) {
    const { allocateAddress } = libAws.awsFns(ec2, 'allocateAddress', abort);

    // const IpProtocol        = fra.arg(argv, 'protocol,proto', {required:false, def: 'tcp'});
    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return allocateAddress({Domain:'vpc'}, debugAwsCalls, function(err, data) {

        my.result = data;

        // Tag it
        return tag({type:'ElasticIp', id: my.result.AllocationId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
      return next();
    }]);
  });
}});

mod.xport({createInternetGateway: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js createInternetGateway --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx;

  return fra.iwrap('awsCommand::createInternetGateway', function(abort, calling) {
    const { createInternetGateway, attachInternetGateway } = libAws.awsFns(ec2, 'createInternetGateway,attachInternetGateway', abort);

    var   InternetGatewayId;
    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:true});

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return createInternetGateway({}, debugAwsCalls, function(err, data) {

        my.result = data;

        // Tag it
        InternetGatewayId = my.result.InternetGateway.InternetGatewayId;
        return tag({type:'InternetGateway', id: InternetGatewayId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
      return attachInternetGateway({VpcId, InternetGatewayId}, debugAwsCalls, function(err, data) {
        // TODO: if an error, delete it
        return next();
      });
    }]);
  });
}});

mod.xport({createNatGateway: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js createNatGateway --subnet= --eip-alloc= --eip=

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx;

  return fra.iwrap('awsCommand::createNatGateway', function(abort, calling) {
    const { createNatGateway, describeAddresses } = libAws.awsFns(ec2, 'createNatGateway,describeAddresses', abort);

    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:true});
    var   AllocationId        = fra.arg(argv, 'AllocationId,eip-alloc', {required:false});
    const ElasticIp           = fra.arg(argv, 'ElasticIp,eip'); // not required

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      if (AllocationId)   { return next(); }

      /* otherwise -- do we have an IP */
      return describeAddresses(awsFilters({"public-ip":[ElasticIp]}), skipAbort, function(err, data) {
        if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
          AllocationId = data.Addresses[0].AllocationId;
        }

        return next();
      });

    }, function(my, next) {
      if (fra.argErrors({AllocationId}))    { return fra.abort(); }

      return createNatGateway({SubnetId, AllocationId}, debugAwsCalls, function(err, data) {

        my.result = data;

        // Tag it
        return tag({type:'NatGateway', id: my.result.NatGateway.NatGatewayId, rawTags: defaultTags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });
    }]);
  });
}});

