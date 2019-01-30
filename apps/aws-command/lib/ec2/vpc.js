
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

const mod                     = ra.modSquad(module, 'awsCommandVpc');

const awsFilters              = libAws.awsFilters;
const awsFilter               = libAws.awsFilter;
const getTag                  = utils.getTag;
const mkTags                  = libTag.mkTags;

const tag                     = ra.load(libTag, 'tag');

const debugAwsCalls           = {debug:true};
// const debugAwsCalls           = {debug:false};
const skipAbort               = {abort:false, ...debugAwsCalls};
const skipAbortNoDebug        = {abort:false, debug:false};

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
  const { fra }   = (ractx.awsCommandVpc__upsertSecurityGroupIngress || ractx);

  return fra.iwrap(function(abort, calling) {
    const { authorizeSecurityGroupIngress, describeSecurityGroups } = libAws.awsFns(ec2, 'authorizeSecurityGroupIngress,describeSecurityGroups', abort);

    const GroupId           = fra.arg(argv, 'GroupId,id', {required:true});
    const IpProtocol        = fra.arg(argv, 'protocol,proto', {required:false, def: 'tcp'});
    const CidrIp            = fra.arg(argv, 'CidrIp,cidr', {required:false});
    const FromPort          = fra.arg(argv, 'FromPort,from', {required:true});
    const ToPort            = fra.arg(argv, 'ToPort,to', {required:true});
    const Description       = fra.arg(argv, 'Description,desc', {required:false});
    const ingressGroupId    = fra.arg(argv, 'ingressGroupId,ingroup,insg');

    if (fra.argErrors())    { return fra.abort(); }

    var UserIdGroupPairs, IpRanges;
    if (CidrIp) {
      IpRanges = [{CidrIp, Description}];
    }

    if (ingressGroupId) {
      UserIdGroupPairs = [{GroupId: ingressGroupId, Description}];
    }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      const IpPermissions   = [{IpProtocol, FromPort, ToPort, IpRanges, UserIdGroupPairs}];
      const params          = {GroupId, IpPermissions};

      // calling('AWS::authorizeSecurityGroupIngress', params);
      return authorizeSecurityGroupIngress(params, {abort:false}, function(err, data) {

        if (err) {
          if (err.code === 'InvalidPermission.Duplicate') {
            if (debugAwsCalls)    { console.log(`AWS::authorizeSecurityGroupIngress()`, sg.inspect({params, err: err.code + '--OK', data})); }

            my.result = {};
            return next();

          } else {
            return abort(err);
          }
        }

        if (debugAwsCalls)    { console.log(`AWS::authorizeSecurityGroupIngress()`, sg.inspect({params, err, data})); }

        my.result = data;
        return next();
      });
    }, function(my, next) {
      return describeSecurityGroups(awsFilters({"group-id":[GroupId]}), debugAwsCalls, function(err, data) {

        /* We found it */
        my.result = {SecurityGroup: data.SecurityGroups[0]};
        // my.found  = 1;
        return next();
      });

  }, function(my, next) {
    return next();
  }]);
  });
}});


mod.xport({upsertSecurityGroup: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js upsertSecurityGroup --name=wide --desc=wide-group --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__upsertSecurityGroup || ractx);

  return fra.iwrap(function(abort, calling) {
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
        my.found  = 1;
        return next();
      });

    }, function(my, next, last) {
      if (my.result.SecurityGroup)  { return next(); }    /* we already have it */

      return sg.__run2(next, [function(next) {
        return createSecurityGroup({VpcId, GroupName, Description}, debugAwsCalls, function(err, data) {

          my.result   = data;
          my.created  = 1;

          // Tag it
          return tag({type:'SecurityGroup', id: my.result.GroupId, rawTags: defaultTags, tags:{Name: GroupName}}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });
      }, function(next) {

        return describeSecurityGroups(awsFilters({"group-id":[my.result.GroupId]}), debugAwsCalls, function(err, data) {

          /* We found it */
          my.result = {SecurityGroup: data.SecurityGroups[0]};
          // my.found  = 1;
          return next();
        });

      }]);

    }, function(my, next) {
      return next();
    }]);
  });
}});

// TODO: call modifySubnetAttribute ( MapPublicIpOnLaunch, AssignIpv6AddressOnCreation )
mod.xport({upsertSubnet: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js upsertSubnet --cidr=10.111.0.0/20 --az=us-east-1a --vpc=
  // ra invoke lib\ec2\vpc.js upsertSubnet --cidr=10.111.0.0/20 --az=us-east-1a --public --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__upsertSubnet || ractx);

  return fra.iwrap(function(abort, calling) {
    const {
      describeSubnets,
      createSubnet,
      modifySubnetAttribute
    } = libAws.awsFns(ec2, 'describeSubnets,createSubnet,modifySubnetAttribute', abort);

    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr', {required:true});
    const VpcId             = fra.arg(argv, 'VpcId,vpc', {required:true});
    const AvailabilityZone  = fra.arg(argv, 'AvailabilityZone,az', {required:true});
    const publicIp          = fra.arg(argv, 'publicIp,public-ip,public');
    const kind              = fra.arg(argv, 'kind');
    const Name              = fra.arg(argv, 'name') || (kind? kind.name : null);

    if (fra.argErrors())    { return fra.abort(); }

    var   SubnetId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeSubnets(awsFilters({cidr:[CidrBlock],"vpc-id":[VpcId]}), debugAwsCalls, function(err, data) {

        if (data.Subnets.length === 0)    { return next(); }
        if (data.Subnets.length > 1)      { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.Subnets.length})`, debug:{subnets: data.Subnets}}); }

        /* We found it */
        my.result = {Subnet: data.Subnets[0]};
        my.found  = 1;
        return next();
      });

    }, function(my, next, last) {
      if (my.result.Subnet)  { return next(); }    /* we already have it */

      return sg.__run2(next, [function(next) {
        return createSubnet({CidrBlock, AvailabilityZone, VpcId}, debugAwsCalls, function(err, data) {

          SubnetId    = data.Subnet.SubnetId;
          my.result   = data;
          my.created  = 1;

          // Tag it
          var   tags = sg.merge({Name});
          return tag({type:'Subnet', id: SubnetId, rawTags: defaultTags, tags}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });

      }, function(next) {
        var   params = {SubnetId};

        if (publicIp)   { params.MapPublicIpOnLaunch = {Value:true} };

        if (sg.numKeys(params) <= 1)    { return next(); }

        return modifySubnetAttribute(params, skipAbort, function(err, data) {
          return next();
        });

      }, function(next) {
        return describeSubnets(awsFilters({"subnet-id":[SubnetId]}), debugAwsCalls, function(err, data) {

          /* We found it */
          my.result = {Subnet: data.Subnets[0]};
          // my.found  = 1;
          return next();
        });
      }]);

    }, function(my, next) {
      return next();
    }]);
  });
}});

// TODO: call modifyVpcAttribute ( EnableDnsSupport, EnableDnsHostNames )
// See also modifyVpcEndpoint, modifyVpcEndpointConnectionNotification, modifyVpcEndpointServiceConfiguration, modifyVpcTenancy
mod.xport({upsertVpc: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js upsertVpc --classB=111

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__upsertVpc || ractx);

  return fra.iwrap(function(abort, calling) {
    const { describeVpcs, createVpc } = libAws.awsFns(ec2, 'describeVpcs,createVpc', abort);

    const classB            = fra.arg(argv, 'classB,class-b');
    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr')    || (classB ? `10.${classB}.0.0/16` : argv.cidr);
    const InstanceTenancy   = 'default';

    const AmazonProvidedIpv6CidrBlock = true;

    const reqd = { CidrBlock };
    if (fra.argErrors(reqd))    { return fra.abort(); }

    var   vpc;

    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      // console.error(`upsertVpc.run`, sg.inspect({CidrBlock, InstanceTenancy, AmazonProvidedIpv6CidrBlock, argv, classB}));

      return describeVpcs(awsFilters({cidr:[CidrBlock]}), function(err, data) {

        if (data.Vpcs.length > 1) {
          return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.Vpcs.length})`, debug:{vpcs: data.Vpcs}});
        }

        if (data.Vpcs.length === 1) {         /* We found it */
          vpc = data.Vpcs[0];
          my.result = {Vpc:vpc};
          my.found  = 1;
          return next();
        }

        return next();
      });

    }, function(my, next, last) {
      if (vpc)  { return next(); }    /* we already have it */

      return createVpc({CidrBlock, InstanceTenancy, AmazonProvidedIpv6CidrBlock}, function(err, data) {

        vpc = data.Vpc;
        my.result   = data;
        my.created  = 1;

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

  // ra invoke lib\ec2\vpc.js getSubnets --classB=111
  // ra invoke lib\ec2\vpc.js getSubnets --classB=111 --kind   # cf-created
  // ra invoke lib\ec2\vpc.js getSubnets --classB=111 --sg= --subnet=
  // ra invoke lib\ec2\vpc.js getSubnets --classB=111 --sg=web --subnet=webtier

  const classB        = argv.classB;
  const kind          = argv.kind ? argv.kind.toLowerCase() : argv.kind;
  const sgName        = argv.sg;
  const subnetName    = argv.subnet;

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

          if (kind && getTag(subnet, 'aws:cloudformation:logical-id').toLowerCase().endsWith(kind)) {
            return sg.ap(m, subnet);
          }

          if (subnetName && (getTag(subnet, 'Name').toLowerCase() === subnetName.toLowerCase())) {
            return sg.ap(m, subnet);
          }
        }
        return m;
      });

      securityGroups = sg.reduce(allSecurityGroups, securityGroups, function(m, securityGroup) {
        if (securityGroup.VpcId === vpc.VpcId) {
          const sgKind = getTag(securityGroup, 'aws:cloudformation:logical-id').toLowerCase();

          if (sgName) {
            if ((getTag(securityGroup, 'Name').toLowerCase() === sgName.toLowerCase())) {
              return sg.ap(m, securityGroup);
            }

          } else if (!kind || sgKind == 'sgwide' || (kind === 'public' && sgKind === 'sgweb')) {
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
  const { fra }   = (ractx.awsCommandVpc__allocateAddress || ractx);

  return fra.iwrap(function(abort, calling) {
    const { allocateAddress, describeAddresses } = libAws.awsFns(ec2, 'allocateAddress,describeAddresses', abort);

    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:false});
    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:false});

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeAddresses(awsFilters({"tag:VpcId":[VpcId],"tag:SubnetId":[SubnetId]}), skipAbort, function(err, data) {
        if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
          my.result = { Address: data.Addresses[0]};
          return callback(null, my);
        }

        return next();
      });

    }, function(my, next) {
      return allocateAddress({Domain:'vpc'}, debugAwsCalls, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        return tag({type:'ElasticIp', id: my.result.AllocationId, rawTags: defaultTags, tags:{VpcId,SubnetId}}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
      return describeAddresses(awsFilters({"tag:VpcId":[VpcId],"tag:SubnetId":[SubnetId]}), skipAbort, function(err, data) {
        if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
          AllocationId = data.Addresses[0].AllocationId;
        }

        my.result = { Address: data.Addresses[0]};
        return next();
      });

    }, function(my, next) {
      return next();
    }]);
  });
}});

mod.xport({createInternetGateway: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js createInternetGateway --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__createInternetGateway || ractx);

  return fra.iwrap(function(abort, calling) {
    const {
      createInternetGateway,
      attachInternetGateway,
      describeInternetGateways
    } = libAws.awsFns(ec2, 'createInternetGateway,attachInternetGateway,describeInternetGateways', abort);

    var   InternetGatewayId;
    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:true});

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      return describeInternetGateways(awsFilters({"attachment.vpc-id":[VpcId]}), debugAwsCalls, function(err, data) {

        if (data.InternetGateways.length === 0)    { return next(); }
        if (data.InternetGateways.length > 1)      { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.InternetGateways.length})`, debug:{internetGatewayss: data.InternetGateways}}); }

        /* We found it */
        my.result = {InternetGateway: data.InternetGateways[0]};
        my.found  = 1;
        return next();
      });

    }, function(my, next) {
      if (my.result.InternetGateway)    { return next(); }

      return sg.__run2(next, [function(next) {
        return createInternetGateway({}, debugAwsCalls, function(err, data) {

          my.result   = data;
          my.created  = 1;

          // Tag it
          InternetGatewayId = my.result.InternetGateway.InternetGatewayId;
          return tag({type:'InternetGateway', id: InternetGatewayId, rawTags: defaultTags}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });
      }, function(next) {
        return attachInternetGateway({VpcId, InternetGatewayId}, debugAwsCalls, function(err, data) {
          // TODO: if an error, delete it
          return next();
        });
      }, function(next) {
        return describeInternetGateways(awsFilters({"internet-gateway-id":[InternetGatewayId]}), debugAwsCalls, function(err, data) {

          my.result = {InternetGateway: data.InternetGateways[0]};
          // my.found  = 1;
          return next();
        });
      }]);

    }, function(my, next) {
      return next();
    }]);
  });
}});

mod.xport({createNatGateway: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js createNatGateway --subnet= --eip-alloc= --eip=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__createNatGateway || ractx);

  return fra.iwrap(function(abort, calling) {
    const { createNatGateway, describeNatGateways, describeAddresses } = libAws.awsFns(ec2, 'createNatGateway,describeNatGateways,describeAddresses', abort);

    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:true});
    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:false});
    var   AllocationId        = fra.arg(argv, 'AllocationId,eip-alloc', {required:false});
    const ElasticIp           = fra.arg(argv, 'ElasticIp,eip'); // not required

    if (fra.argErrors())    { return fra.abort(); }

    var NatGatewayId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      return describeNatGateways(awsFilter({"subnet-id":[SubnetId]}), {}, function(err, data) {
        data.NatGateways = _.filter(data.NatGateways || [], function(gw) {
          return gw.State in  {pending:true,available:true};
        });

        if (data.NatGateways.length === 0)  { return next(); }
        if (data.NatGateways.length > 1)    { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.NatGateways.length})`, debug:{natGateways: data.NatGateways}}); }

        const NatGateway = data.NatGateways[0];
        // if (!(NatGateway.State in {pending:true,available:true}))     { return next(); }

        /* We found it */
        my.result = {NatGateway};
        my.found  = 1;
        return callback(null, my);
      });

    }, function(my, next) {
      if (AllocationId)   { return next(); }

      /* otherwise -- do we have an IP */
      return describeAddresses(awsFilters({"public-ip":[ElasticIp]}), skipAbort, function(err, data) {
        if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
          AllocationId = data.Addresses[0].AllocationId;
          return next();
        }

        return describeAddresses(awsFilters({"tag:VpcId":[VpcId],"tag:SubnetId":[SubnetId]}), skipAbort, function(err, data) {
          if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
            AllocationId = data.Addresses[0].AllocationId;
          }

          return next();
        });
      });

    }, function(my, next) {
      if (fra.argErrors({AllocationId}))    { return fra.abort(); }

      return createNatGateway({SubnetId, AllocationId}, debugAwsCalls, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        NatGatewayId = my.result.NatGateway.NatGatewayId;
        return tag({type:'NatGateway', id: NatGatewayId, rawTags: defaultTags, tags:{SubnetId}}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });
    }, function(my, next) {
      return sg.until(function(again, last, count, elapsed) {
        console.error(`untilnat`, sg.inspect({count, elapsed}));
        return describeNatGateways(awsFilter({"nat-gateway-id":[NatGatewayId]}), debugAwsCalls, function(err, data) {
          if (data.NatGateways.length === 0)  { return next(); }
          if (data.NatGateways.length > 1)    { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.NatGateways.length})`, debug:{natGateways: data.NatGateways}}); }


          /* We found it */
          my.result = {NatGateway: data.NatGateways[0]};
          // my.found  = 1;

          if (my.result.NatGateway.State === 'pending') {
            return again(5000);
          }

          if (my.result.NatGateway.State === 'available') {
            return last();
          }

          return abort({code: 'ENATFAILED', msg:`Creation of NAT failed`});
        });

      }, function done() {
        return callback(null, my);
      });

    }]);
  });
}});

mod.xport({createRouteTable: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js createRouteTable --subnet= --vpc= --public

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__createRouteTable || ractx);

  return fra.iwrap(function(abort, calling) {
    const { createRouteTable, describeRouteTables, associateRouteTable } = libAws.awsFns(ec2, 'createRouteTable,describeRouteTables,associateRouteTable', abort);

    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:false});
    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:true});
    const public              = fra.arg(argv, 'public');

    if (fra.argErrors())    { return fra.abort(); }

    var access = (public? 'public' : 'private');
    var RouteTableId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      var filters = {"vpc-id":[VpcId]};
      if (SubnetId) {
        filters["association.subnet-id"] = [SubnetId];
      } else if (public) {
        filters["tag:access"] = [access];
      } else {
        if (fra.argErrors({SubnetId}))    { return fra.abort(); }
      }

      return describeRouteTables(awsFilters(filters), {}, function(err, data) {

        if (data.RouteTables.length === 0)  { return next(); }
        if (data.RouteTables.length > 1)    { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.RouteTables.length})`, debug:{routeTables: data.RouteTables}}); }

        const RouteTable = data.RouteTables[0];

        /* We found it */
        my.result = {RouteTable};
        my.found  = 1;
        return callback(null, my);
      });

    }, function(my, next) {

      return createRouteTable({VpcId}, debugAwsCalls, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        var   tags = {};
        if (SubnetId) { tags = { ...tags, SubnetId }; }
        if (access)   { tags = { ...tags, access }; }

        RouteTableId = my.result.RouteTable.RouteTableId;
        return tag({type:'RouteTable', id: RouteTableId, rawTags: defaultTags, tags}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
      if (!SubnetId)  { return next(); }

      return associateRouteTable({SubnetId, RouteTableId}, debugAwsCalls, function(err, data) {
        return next();
      });
    }, function(my, next) {
      return describeRouteTables(awsFilters({"route-table-id":[RouteTableId]}), {}, function(err, data) {
        my.result = {RouteTable: data.RouteTables[0]};
        return callback(null, my);
      });

    }]);
  });
}});

mod.xport({associateRouteTable: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js associateRouteTable --subnet= --table=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__associateRouteTable || ractx);

  return fra.iwrap(function(abort, calling) {
    const { associateRouteTable } = libAws.awsFns(ec2, 'associateRouteTable', abort);

    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:false});
    const RouteTableId        = fra.arg(argv, 'RouteTableId,route-table,table', {required:true});

    if (fra.argErrors())    { return fra.abort(); }

    return associateRouteTable({SubnetId, RouteTableId}, debugAwsCalls, function(err, data) {
      return callback(err, data);
    });
  });
}});

mod.xport({createRoute: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js createRoute --cidr=0.0.0.0/0 --gw= --table=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__createRoute || ractx);

  return fra.iwrap(function(abort) {
    const { createRoute }             = libAws.awsFns(ec2, 'createRoute', abort);

    const RouteTableId                = fra.arg(argv, 'RouteTableId,route-table,table', {required:true});
    const DestinationCidrBlock        = fra.arg(argv, 'DestinationCidrBlock,cidr');
    const DestinationIpv6CidrBlock    = fra.arg(argv, 'DestinationIpv6CidrBlock,cidr6');
    const EgressOnlyInternetGatewayId = fra.arg(argv, 'EgressOnlyInternetGatewayId,egress');
    const GatewayId                   = fra.arg(argv, 'GatewayId,gateway,gw');
    const InstanceId                  = fra.arg(argv, 'InstanceId,instance');
    const NatGatewayId                = fra.arg(argv, 'NatGatewayId,nat');
    const NetworkInterfaceId          = fra.arg(argv, 'NetworkInterfaceId,nic');
    const TransitGatewayId            = fra.arg(argv, 'TransitGatewayId,transit');
    const VpcPeeringConnectionId      = fra.arg(argv, 'VpcPeeringConnectionId,peering,peer');

    if (fra.argErrors())              { return fra.abort(); }

    const reqd_   = { RouteTableId };
    const reqd    = sg.smartExtend({ ...reqd_ });

    const target_  = {
      DestinationCidrBlock, DestinationIpv6CidrBlock
    };
    const target = sg.smartExtend({ ...target_ });

    const dest_ = {
      EgressOnlyInternetGatewayId, GatewayId, NatGatewayId,
      InstanceId, NetworkInterfaceId,
      TransitGatewayId, VpcPeeringConnectionId
    };

    const dest = sg.smartExtend({ ...dest_ });

    const params = { ...reqd, ...target, ...dest };
    // console.error(`createRoute`, sg.inspect({reqd_, target_, dest_, reqd, target, dest}));

    if (sg.numKeys(target) === 0 || sg.numKeys(dest) !== 1) {
      return fra.abort(`Must provide RouteTableId and one or both of [[${sg.keys(target_)}]], and one of [[${sg.keys(dest_)}]]`);
    }

    return createRoute(params, debugAwsCalls, function(err, data) {
      return callback(err, data);
    });
  });
}});

// TODO: createVpcEndpointConnectionNotification,createVpcEndpointServiceConfiguration
mod.xport({createVpcEndpoint: function(argv, context, callback) {

  // ra invoke lib\ec2\vpc.js createVpcEndpoint --vpc= --service= --tables=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommandVpc__createVpcEndpoint || ractx);

  return fra.iwrap(function(abort, calling) {
    const { createVpcEndpoint,describeVpcEndpoints } = libAws.awsFns(ec2, 'createVpcEndpoint,describeVpcEndpoints', abort);

    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:true});
    const ServiceName         = fra.arg(argv, 'ServiceName,service', {required:true});
    const VpcEndpointType     = fra.arg(argv, 'VpcEndpointType,type', {def:'Gateway'});
    const ClientToken         = fra.arg(argv, 'ClientToken,token');

    // type === Gateway
    const RouteTableIds       = fra.arg(argv, 'RouteTableIds,tables', {array:true});
    const PolicyDocument      = fra.arg(argv, 'PolicyDocument,policy');

    // Type === Interface
    const PrivateDnsEnabled   = fra.arg(argv, 'PrivateDnsEnabled,dns');
    const SecurityGroupIds    = fra.arg(argv, 'SecurityGroupIds,sgs', {array:true});
    const SubnetIds           = fra.arg(argv, 'SubnetIds,subnets', {array:true});

    if (fra.argErrors())    { return fra.abort(); }

    const reqd        = sg.smartExtend({VpcId, ServiceName, VpcEndpointType});
    const optional    = sg.smartExtend({ClientToken});

    const gateway_    = {PolicyDocument, RouteTableIds};
    const gateway     = sg.smartExtend({...gateway_});
    const interface_  = {PrivateDnsEnabled,SecurityGroupIds,SubnetIds};
    const interface   = sg.smartExtend({...interface_});

    const params  = { ...reqd, ...optional, ...gateway, ...interface };

    // console.error(`createVpcEndpoint`, sg.inspect({interface_, gateway_, interface, gateway, optional, reqd}));

    var   VpcEndpointId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeVpcEndpoints(awsFilters({'vpc-id':[VpcId],'service-name':[ServiceName]}), debugAwsCalls, function(err, data) {
        if (data.VpcEndpoints.length === 0)   { return next(); }

        my.result = {VpcEndpoint: data.VpcEndpoints[0]};
        my.found  = 1;

        return callback(null, my);
      });

    }, function(my, next) {
      return createVpcEndpoint(params, debugAwsCalls, function(err, data) {
        my.result   = data;
        my.created  = 1;
        VpcEndpointId = my.result.VpcEndpoint.VpcEndpointId;

        // Cannot tag VpcEndpoints

        return next();
      });
    }, function(my, next) {

      return describeVpcEndpoints({VpcEndpointIds:[VpcEndpointId]}, debugAwsCalls, function(err, data) {
        my.result = {VpcEndpoint: data.VpcEndpoints[0]};
        // my.found  = 1;

        return next();
      });

    }, function(my, next) {
      return next();
    }]);
  });
}});


