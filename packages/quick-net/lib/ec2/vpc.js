if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const utils                   = require('../utils');
const awsDefs                 = require('../aws-defs');
const AWS                     = require('aws-sdk');
const libTag                  = require('./tags');
const libAws                  = require('../aws');
const libDescribeVpc          = require('./vpc/describe');

const mod                     = ra.modSquad(module, 'quickNetVpc');

const awsFilters              = libAws.awsFilters;
const awsFilter               = libAws.awsFilter;
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


// See also modifyVpcEndpoint, modifyVpcEndpointConnectionNotification, modifyVpcEndpointServiceConfiguration, modifyVpcTenancy
mod.xport({upsertVpc: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js upsertVpc --classB=111

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__upsertVpc || ractx);

  return rax.iwrap(function(abort) {
    const { createVpc,modifyVpcAttribute } = libAws.awsFns(ec2, 'describeVpcs,createVpc,modifyVpcAttribute', rax.opts({}), abort);
    const { describeVpcs }                 = rax.loads(libDescribeVpc, 'describeVpcs', rax.opts({}), abort);

    const classB            = rax.arg(argv, 'classB,class-b');
    const CidrBlock         = rax.arg(argv, 'CidrBlock,cidr')    || (classB ? `10.${classB}.0.0/16` : argv.cidr);
    const adjective         = rax.arg(argv, 'adjective,adj');
    const suffix            = rax.arg(argv, 'suffix');
    const InstanceTenancy   = 'default';

    const AmazonProvidedIpv6CidrBlock = true;

    const reqd = { CidrBlock };
    if (rax.argErrors(reqd))    { return rax.abort(); }

    var   vpc;
    var   VpcId;

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      // See if we already have it
      return describeVpcs({classB, CidrBlock}, rax.opts({}), function(err, data) {

        // Must be unique CIDR block
        if (data.Vpcs.length > 1) {
          return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.Vpcs.length})`, debug:{vpcs: data.Vpcs}});
        }

        // Store values for use later, result
        if (data.Vpcs.length === 1) {         /* We found it */
          vpc         = data.Vpcs[0];
          my.result   = {Vpc:vpc};
          my.found    = 1;

          return next();
        }

        // Did not find it, oh well, we will have to create it
        return next();
      });

    }, function(my, next, last) {
      if (vpc)  { return next(); }    /* we already have it */

      // Create the VPC, tag it, set a few attributes for DNS
      return sg.__run2(next, [function(next) {
        return createVpc({CidrBlock, InstanceTenancy, AmazonProvidedIpv6CidrBlock}, function(err, data) {

          // Store for later
          vpc         = data.Vpc;
          VpcId       = vpc.VpcId;
          my.result   = data;
          my.created  = 1;

          // Tag it
          return tag({type:'Vpc', id: VpcId, rawTags: defaultTags, adjective, suffix}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });

      }, function(next) {

        // DNS
        const EnableDnsSupport    = {Value:true};
        const EnableDnsHostnames  = {Value:true};
        return modifyVpcAttribute({VpcId, EnableDnsSupport}, function(err, data) {
          return modifyVpcAttribute({VpcId, EnableDnsHostnames}, function(err, data) {
            return next();
          });
        });

      }, function(next) {

        // We want to return the complete object, not the limited one you get back from create()
        return describeVpcs({VpcId}, rax.opts({}), function(err, data) {

          /* We found it */
          my.result = {Vpc: data.Vpcs[0]};
          // my.found  = 1;

          return next();
        });
      }]);


    }, function(my, next) {
      return next();
    }]);
  });
}});

mod.xport({upsertSubnet: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js upsertSubnet --cidr=10.111.0.0/20 --az=us-east-1a --vpc=
  // ra invoke packages\quick-net\lib\ec2\vpc.js upsertSubnet --cidr=10.111.0.0/20 --az=us-east-1a --public --vpc=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__upsertSubnet || ractx);

  return rax.iwrap(function(abort, calling) {
    const {
      createSubnet,
      modifySubnetAttribute
    }                             = libAws.awsFns(ec2, 'createSubnet,modifySubnetAttribute', rax.opts({}), abort);
    const { describeSubnets }     = rax.loads(libDescribeVpc, 'describeSubnets', rax.opts({}), abort);

    const CidrBlock         = rax.arg(argv, 'CidrBlock,cidr', {required:true});
    const VpcId             = rax.arg(argv, 'VpcId,vpc');
    const AvailabilityZone  = rax.arg(argv, 'AvailabilityZone,az', {required:true});
    const publicIp          = rax.arg(argv, 'publicIp,public-ip,public');
    const kind              = rax.arg(argv, 'kind');
    const Name              = rax.arg(argv, 'name') || (kind? _.compact([kind.name, zoneSuffix(AvailabilityZone)]).join('-') : null);
    const adjective         = rax.arg(argv, 'adjective,adj');
    const suffix            = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

    var   SubnetId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeSubnets(rax.opts({CidrBlock, VpcId}), rax.opts({}), function(err, data) {

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
        return createSubnet({CidrBlock, AvailabilityZone, VpcId}, function(err, data) {

          SubnetId    = data.Subnet.SubnetId;
          my.result   = data;
          my.created  = 1;

          // Tag it
          var   tags = sg.merge({Name});
          return tag({type:'Subnet', id: SubnetId, rawTags: defaultTags, tags, adjective, suffix}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });

      }, function(next) {
        var   params = {SubnetId};

        if (publicIp)   { params.MapPublicIpOnLaunch = {Value:true}; }

        if (sg.numKeys(params) <= 1)    { return next(); }

        return modifySubnetAttribute(params, {abort:false}, function(err, data) {
          return next();
        });

      }, function(next) {
        return describeSubnets({SubnetId}, rax.opts({}), function(err, data) {

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

mod.xport({upsertSecurityGroup: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js upsertSecurityGroup --name=wide --desc=wide-group --vpc=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__upsertSecurityGroup || ractx);

  return rax.iwrap(function(abort, calling) {
    const { describeSecurityGroups, createSecurityGroup } = libAws.awsFns(ec2, 'describeSecurityGroups,createSecurityGroup', rax.opts({}), abort);

    const VpcId             = rax.arg(argv, 'VpcId,vpc', {required:true});
    const GroupName         = rax.arg(argv, 'GroupName,name', {required:true});
    const Description       = rax.arg(argv, 'Description,desc', {required:false});
    const adjective         = rax.arg(argv, 'adjective,adj');
    const suffix            = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeSecurityGroups(awsFilters({"vpc-id":[VpcId],"group-name":[GroupName]}), function(err, data) {

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
        return createSecurityGroup({VpcId, GroupName, Description}, function(err, data) {

          my.result   = data;
          my.created  = 1;

          // Tag it
          return tag({type:'SecurityGroup', id: my.result.GroupId, rawTags: defaultTags, tags:{Name: GroupName}, adjective, suffix}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });
      }, function(next) {

        return describeSecurityGroups(awsFilters({"group-id":[my.result.GroupId]}), function(err, data) {

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

mod.xport({upsertSecurityGroupIngress: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js upsertSecurityGroupIngress --cidr=10.0.0.0/8 --from=22 --to=22  --desc=from-wide-group  --id=sg-

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__upsertSecurityGroupIngress || ractx);

  return rax.iwrap(function(abort) {
    const { authorizeSecurityGroupIngress, describeSecurityGroups } = libAws.awsFns(ec2, 'authorizeSecurityGroupIngress,describeSecurityGroups', rax.opts({}), abort);

    const GroupId           = rax.arg(argv, 'GroupId,id', {required:true});
    const IpProtocol        = rax.arg(argv, 'protocol,proto', {required:false, def: 'tcp'});
    const CidrIp            = rax.arg(argv, 'CidrIp,cidr', {required:false});
    const FromPort          = rax.arg(argv, 'FromPort,from', {required:true});
    const ToPort            = rax.arg(argv, 'ToPort,to', {required:true});
    const Description       = rax.arg(argv, 'Description,desc', {required:false});
    const ingressGroupId    = rax.arg(argv, 'ingressGroupId,ingroup,insg');
    const adjective         = rax.arg(argv, 'adjective,adj');
    const suffix            = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

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

      // Some APIs, like this one give errors when you try to do it again. It is easier
      // in this case to just handle the error, than to try to determine if we already have this one.

      return authorizeSecurityGroupIngress(params, {abort:false}, function(err, data) {

        if (err) {

          // This is OK, we already have what we wanted
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
    }, function(my, next) {
      return describeSecurityGroups(awsFilters({"group-id":[GroupId]}), function(err, data) {

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

mod.xport({allocateAddress: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js allocateAddress

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__allocateAddress || ractx);

  return rax.iwrap(function(abort, calling) {
    const { allocateAddress, describeAddresses } = libAws.awsFns(ec2, 'allocateAddress,describeAddresses', rax.opts({}), abort);

    const VpcId               = rax.arg(argv, 'VpcId,vpc', {required:false});
    const SubnetId            = rax.arg(argv, 'SubnetId,subnet', {required:false});
    const adjective           = rax.arg(argv, 'adjective,adj');
    const suffix              = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      // Some APIs, like this one give errors when you try to do it again. It is easier
      // in this case to just handle the error, than to try to determine if we already have this one.

      return describeAddresses(awsFilters({"tag:VpcId":[VpcId],"tag:SubnetId":[SubnetId]}), {abort:false}, function(err, data) {
        if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
          my.result = { Address: data.Addresses[0]};
          return callback(null, my);
        }

        return next();
      });

    }, function(my, next) {
      return allocateAddress({Domain:'vpc'}, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        return tag({type:'ElasticIp', id: my.result.AllocationId, rawTags: defaultTags, tags:{VpcId,SubnetId}, adjective, suffix}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {

      // Some APIs, like this one give errors when you try to do it again. It is easier
      // in this case to just handle the error, than to try to determine if we already have this one.

      return describeAddresses(awsFilters({"tag:VpcId":[VpcId],"tag:SubnetId":[SubnetId]}), {abort:false}, function(err, data) {
        if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
          let AllocationId = data.Addresses[0].AllocationId;
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

  // ra invoke packages\quick-net\lib\ec2\vpc.js createInternetGateway --vpc=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__createInternetGateway || ractx);

  return rax.iwrap(function(abort) {
    const {
      createInternetGateway,
      attachInternetGateway,
      describeInternetGateways
    } = libAws.awsFns(ec2, 'createInternetGateway,attachInternetGateway,describeInternetGateways', rax.opts({}), abort);

    var   InternetGatewayId;
    const VpcId             = rax.arg(argv, 'VpcId,vpc', {required:true});
    const adjective         = rax.arg(argv, 'adjective,adj');
    const suffix            = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      return describeInternetGateways(awsFilters({"attachment.vpc-id":[VpcId]}), function(err, data) {

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
        return createInternetGateway({}, function(err, data) {

          my.result   = data;
          my.created  = 1;

          // Tag it
          InternetGatewayId = my.result.InternetGateway.InternetGatewayId;
          return tag({type:'InternetGateway', id: InternetGatewayId, rawTags: defaultTags, adjective, suffix}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });
      }, function(next) {
        return attachInternetGateway({VpcId, InternetGatewayId}, function(err, data) {
          // TODO: if an error, delete it
          return next();
        });
      }, function(next) {
        return describeInternetGateways(awsFilters({"internet-gateway-id":[InternetGatewayId]}), function(err, data) {

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

  // ra invoke packages\quick-net\lib\ec2\vpc.js createNatGateway --subnet= --eip-alloc= --eip=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__createNatGateway || ractx);

  return rax.iwrap(function(abort, calling) {
    const { createNatGateway, describeNatGateways, describeAddresses } = libAws.awsFns(ec2, 'createNatGateway,describeNatGateways,describeAddresses', rax.opts({}), abort);

    const SubnetId            = rax.arg(argv, 'SubnetId,subnet', {required:true});
    const VpcId               = rax.arg(argv, 'VpcId,vpc', {required:false});
    var   AllocationId        = rax.arg(argv, 'AllocationId,eip-alloc', {required:false});
    const ElasticIp           = rax.arg(argv, 'ElasticIp,eip'); // not required
    const adjective           = rax.arg(argv, 'adjective,adj');
    const suffix              = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

    var NatGatewayId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      return describeNatGateways(awsFilter({"subnet-id":[SubnetId]}), {}, function(err, data) {
        data.NatGateways = _.filter(data.NatGateways || [], function(gw) {
          return gw.State in  {pending:true,available:true};
        });

        if (data.NatGateways.length === 0)  { return next(); }
        if (data.NatGateways.length > 1)    { return abort({code: 'EAMBIGUOUS', msg:`Too many found (${data.NatGateways.length})`, debug:{natGateways: data.NatGateways}}); }

        const NatGateway = data.NatGateways[0];

        /* We found it */
        my.result = {NatGateway};
        my.found  = 1;
        return callback(null, my);
      });

    }, function(my, next) {
      if (AllocationId)   { return next(); }

      /* otherwise -- do we have an IP */
      return describeAddresses(awsFilters({"public-ip":[ElasticIp]}), {abort:false}, function(err, data) {
        if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
          AllocationId = data.Addresses[0].AllocationId;
          return next();
        }

        return describeAddresses(awsFilters({"tag:VpcId":[VpcId],"tag:SubnetId":[SubnetId]}), {abort:false}, function(err, data) {
          if (sg.ok(err, data) && data.Addresses && data.Addresses.length > 0) {
            AllocationId = data.Addresses[0].AllocationId;
          }

          return next();
        });
      });

    }, function(my, next) {
      if (rax.argErrors({AllocationId}))    { return rax.abort(); }

      return createNatGateway({SubnetId, AllocationId}, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        NatGatewayId = my.result.NatGateway.NatGatewayId;
        return tag({type:'NatGateway', id: NatGatewayId, rawTags: defaultTags, tags:{SubnetId}, adjective, suffix}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });
    }, function(my, next) {

      // NAT gateways take a long time to startup

      return sg.until(function(again, last, count, elapsed) {
        return describeNatGateways(awsFilter({"nat-gateway-id":[NatGatewayId]}), function(err, data) {
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

  // ra invoke packages\quick-net\lib\ec2\vpc.js createRouteTable --subnet= --vpc= --public

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__createRouteTable || ractx);

  return rax.iwrap(function(abort, calling) {
    const { createRouteTable, describeRouteTables, associateRouteTable } = libAws.awsFns(ec2, 'createRouteTable,describeRouteTables,associateRouteTable', rax.opts({}), abort);

    const SubnetId            = rax.arg(argv, 'SubnetId,subnet', {required:false});
    const VpcId               = rax.arg(argv, 'VpcId,vpc', {required:true});
    const isPublic            = rax.arg(argv, 'public');
    const adjective           = rax.arg(argv, 'adjective,adj');
    const suffix              = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

    var access = (isPublic? 'public' : 'private');
    var RouteTableId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      var filters = {"vpc-id":[VpcId]};
      if (SubnetId) {
        filters["association.subnet-id"] = [SubnetId];
      } else if (isPublic) {
        filters["tag:access"] = [access];
      } else {
        if (rax.argErrors({SubnetId}))    { return rax.abort(); }
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

      return createRouteTable({VpcId}, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        var   tags = {};
        if (SubnetId) { tags = { ...tags, SubnetId }; }
        if (access)   { tags = { ...tags, access }; }

        RouteTableId = my.result.RouteTable.RouteTableId;
        return tag({type:'RouteTable', id: RouteTableId, rawTags: defaultTags, tags, adjective, suffix}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {
      if (!SubnetId)  { return next(); }

      return associateRouteTable({SubnetId, RouteTableId}, function(err, data) {
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

  // ra invoke packages\quick-net\lib\ec2\vpc.js associateRouteTable --subnet= --table=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__associateRouteTable || ractx);

  return rax.iwrap(function(abort, calling) {
    const { associateRouteTable } = libAws.awsFns(ec2, 'associateRouteTable', rax.opts({}), abort);

    const SubnetId            = rax.arg(argv, 'SubnetId,subnet', {required:false});
    const RouteTableId        = rax.arg(argv, 'RouteTableId,route-table,table', {required:true});
    const adjective           = rax.arg(argv, 'adjective,adj');
    const suffix              = rax.arg(argv, 'suffix');

    if (rax.argErrors())    { return rax.abort(); }

    return associateRouteTable({SubnetId, RouteTableId}, function(err, data) {
      return callback(err, data);
    });
  });
}});


mod.xport({deleteRoute: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js deleteRoute --cidr=0.0.0.0/0 --table=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__createRoute || ractx);

  return rax.iwrap(function(abort) {
    const { deleteRoute }             = libAws.awsFns(ec2, 'deleteRoute', rax.opts({}), abort);

    const RouteTableId                = rax.arg(argv, 'RouteTableId,route-table,table', {required:true});
    const DestinationCidrBlock        = rax.arg(argv, 'DestinationCidrBlock,cidr');
    const DestinationIpv6CidrBlock    = rax.arg(argv, 'DestinationIpv6CidrBlock,cidr6');

    const params = sg.extend({RouteTableId, DestinationCidrBlock, DestinationIpv6CidrBlock});

    return deleteRoute(params, {abort:false}, function(err, data) {
sg.elog(`deleteRoute`, {params, err, data});
      if (err) {
        if (err.code === 'RouteAlreadyExists') {
          return callback(null, data);

        } else {
          return abort(err);
        }
      }

      return callback(err, data);
    });
  });
}});

mod.xport({createRoute: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js createRoute --cidr=0.0.0.0/0 --gw= --table=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__createRoute || ractx);

  return rax.iwrap(function(abort) {
    const { createRoute }             = libAws.awsFns(ec2, 'createRoute', rax.opts({}), abort);

    const RouteTableId                = rax.arg(argv, 'RouteTableId,route-table,table', {required:true});
    const DestinationCidrBlock        = rax.arg(argv, 'DestinationCidrBlock,cidr');
    const DestinationIpv6CidrBlock    = rax.arg(argv, 'DestinationIpv6CidrBlock,cidr6');
    const EgressOnlyInternetGatewayId = rax.arg(argv, 'EgressOnlyInternetGatewayId,egress');
    const GatewayId                   = rax.arg(argv, 'GatewayId,gateway,gw');
    const InstanceId                  = rax.arg(argv, 'InstanceId,instance');
    const NatGatewayId                = rax.arg(argv, 'NatGatewayId,nat');
    const NetworkInterfaceId          = rax.arg(argv, 'NetworkInterfaceId,nic');
    const TransitGatewayId            = rax.arg(argv, 'TransitGatewayId,transit');
    const VpcPeeringConnectionId      = rax.arg(argv, 'VpcPeeringConnectionId,peering,peer');
    const adjective                   = rax.arg(argv, 'adjective,adj');
    const suffix                      = rax.arg(argv, 'suffix');

    if (rax.argErrors())              { return rax.abort(); }

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

    if (sg.numKeys(target) === 0 || sg.numKeys(dest) !== 1) {
      return rax.abort(`Must provide RouteTableId and one or both of [[${sg.keys(target_)}]], and one of [[${sg.keys(dest_)}]]`);
    }

    return createRoute(params, {abort:false}, function(err, data) {
sg.elog(`createRoute`, {params, err, data});
      if (err) {
        if (err.code === 'RouteAlreadyExists') {
          return callback(null, data);

        } else {
          return abort(err);
        }
      }

      return callback(err, data);
    });
  });
}});

// TODO: createVpcEndpointConnectionNotification,createVpcEndpointServiceConfiguration
mod.xport({createVpcEndpoint: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js createVpcEndpoint --vpc= --service= --tables=

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__createVpcEndpoint || ractx);

  return rax.iwrap(function(abort, calling) {
    const { createVpcEndpoint,describeVpcEndpoints } = libAws.awsFns(ec2, 'createVpcEndpoint,describeVpcEndpoints', rax.opts({}), abort);

    const VpcId               = rax.arg(argv, 'VpcId,vpc', {required:true});
    const ServiceName         = rax.arg(argv, 'ServiceName,service', {required:true});
    const VpcEndpointType     = rax.arg(argv, 'VpcEndpointType,type', {def:'Gateway'});
    const ClientToken         = rax.arg(argv, 'ClientToken,token');
    const adjective           = rax.arg(argv, 'adjective,adj');
    const suffix              = rax.arg(argv, 'suffix');

    // type === Gateway
    const RouteTableIds       = rax.arg(argv, 'RouteTableIds,tables', {array:true});
    const PolicyDocument      = rax.arg(argv, 'PolicyDocument,policy');

    // Type === Interface
    const PrivateDnsEnabled   = rax.arg(argv, 'PrivateDnsEnabled,dns');
    const SecurityGroupIds    = rax.arg(argv, 'SecurityGroupIds,sgs', {array:true});
    const SubnetIds           = rax.arg(argv, 'SubnetIds,subnets', {array:true});

    if (rax.argErrors())    { return rax.abort(); }

    const reqd        = sg.smartExtend({VpcId, ServiceName, VpcEndpointType});
    const optional    = sg.smartExtend({ClientToken});

    const gateway_    = {PolicyDocument, RouteTableIds};
    const gateway     = sg.smartExtend({...gateway_});
    const interface_  = {PrivateDnsEnabled,SecurityGroupIds,SubnetIds};
    const iface       = sg.smartExtend({...interface_});

    const params  = { ...reqd, ...optional, ...gateway, ...iface };

    var   VpcEndpointId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeVpcEndpoints(awsFilters({'vpc-id':[VpcId],'service-name':[ServiceName]}), function(err, data) {
        if (data.VpcEndpoints.length === 0)   { return next(); }

        my.result = {VpcEndpoint: data.VpcEndpoints[0]};
        my.found  = 1;

        return callback(null, my);
      });

    }, function(my, next) {
      return createVpcEndpoint(params, function(err, data) {
        my.result   = data;
        my.created  = 1;
        VpcEndpointId = my.result.VpcEndpoint.VpcEndpointId;

        // Tag it
        var   tags = {};

        return tag({type:'VpcEndpoint', id: VpcEndpointId, rawTags: defaultTags, tags, adjective, suffix}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });
    }, function(my, next) {

      return describeVpcEndpoints({VpcEndpointIds:[VpcEndpointId]}, function(err, data) {
        my.result = {VpcEndpoint: data.VpcEndpoints[0]};
        // my.found  = 1;

        return next();
      });

    }, function(my, next) {
      return next();
    }]);
  });
}});

mod.xport({getSubnets: function(argv, context, callback) {

  /*
    ra invoke packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111
    ra invoke packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111 --kind   # cf-created
    ra invoke packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111 --sg= --subnet=
    ra invoke packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111 --sg=web --subnet=webtier

    Can ssh:
    ra invoke packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111 --sg=admin --subnet=webtier --id
    ra invoke\packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111 --sg=admin --subnet=webtier | jq . | grep Id
  */

  const ractx     = context.runAnywhere || {};
  const { rax }   = (ractx.quickNetVpc__getSubnets || ractx);

  return rax.iwrap(function(abort, calling) {
    const { describeVpcs,describeSecurityGroups,describeSubnets } = libAws.awsFns(ec2, 'describeVpcs,describeSecurityGroups,describeSubnets', rax.opts({}), abort);

    const classB        = ''+argv.classB;
    const kind          = argv.kind ? argv.kind.toLowerCase() : argv.kind;
    const ids           = argv.ids;
    const subnetNames   = sg.arrayify(argv.subnet   || argv.subnets   || argv.subnetName            || argv.SubnetId);
    const sgNames       = sg.arrayify(argv.sg       || argv.sgs   || argv.sgName  || argv.SecurityGroupIds);

    var   allVpcs, allSubnets, allSecurityGroups;

    var   errors = [];
    return sg.__runll([function(next) {

      return describeVpcs({}, {abort:false}, function(err, data) {
        if (!sg.ok(err, data)) { errors.push(err); return next(); }

        allVpcs = data.Vpcs;
        return next();
      });
    }, function(next) {

      return describeSecurityGroups({}, {abort:false}, function(err, data) {
        if (!sg.ok(err, data)) { errors.push(err); return next(); }

        allSecurityGroups = data.SecurityGroups;
        return next();
      });
    }, function(next) {

      return describeSubnets({}, {abort:false}, function(err, data) {
        if (!sg.ok(err, data)) { errors.push(err); return next(); }

        allSubnets = data.Subnets;
        return next();
      });
    }], function done() {

      if (_.compact(errors).length !== 0) {
        return callback(errors);
      }

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
        subnets = sg.reduce(allSubnets, subnets, function(m0, subnet) {
          if (subnet.VpcId === vpc.VpcId) {
            const subnetTag = getTag(subnet, 'Name').toLowerCase();

            if (kind && getTag(subnet, 'aws:cloudformation:logical-id').toLowerCase().endsWith(kind)) {
              return sg.ap(m0, subnet);
            }

            return sg.reduce(subnetNames, m0, (m, subnetName) => {
              if (subnetTag.startsWith(subnetName.toLowerCase())) {
                return sg.ap(m, subnet);
              }
              return m;
            });
          }
          return m0;
        });

        securityGroups = sg.reduce(allSecurityGroups, securityGroups, function(m, securityGroup) {
          if (securityGroup.VpcId === vpc.VpcId) {
            const sgKind = getTag(securityGroup, 'aws:cloudformation:logical-id').toLowerCase();
            const sgtag  = getTag(securityGroup, 'Name').toLowerCase();

            if (sgNames) {
              if (sgNames.indexOf(sgtag) !== -1) {
                return sg.ap(m, securityGroup);
              }

            } else if (!kind || sgKind === 'sgwide' || (kind === 'public' && sgKind === 'sgweb')) {
              return sg.ap(m, securityGroup);
            }
          }
          return m;
        });
      });

      if (ids) {
        result.subnets          = _.map(subnets, ({SubnetId, AvailabilityZone}) => ({SubnetId, AvailabilityZone}));
        result.securityGroups   = sg.pluck(securityGroups, 'GroupId');
      } else {
        result.vpcs = vpcs;
        result.subnets = subnets;
        result.securityGroups = securityGroups;
      }

      if (_.compact(_.flatten(_.values(_.pick(result, 'subnets', 'securityGroups')))).length === 0) {
        result.__hint__ = `You could add classB, sgs, subnet`;
      }

      return callback(null, result);
    });
  });

}});

function zoneSuffix(AvailabilityZone) {
  return `zone${(_.last(AvailabilityZone) || 'z').toUpperCase()}`;
}

