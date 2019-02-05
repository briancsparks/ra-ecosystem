
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
  const { fra }   = (ractx.quickNetVpc__upsertVpc || ractx);

  return fra.iwrap(function(abort) {
    const { createVpc,modifyVpcAttribute } = libAws.awsFns(ec2, 'describeVpcs,createVpc,modifyVpcAttribute', fra.opts({}), abort);
    const { describeVpcs }                 = fra.loads(libDescribeVpc, 'describeVpcs', fra.opts({}), abort);

    const classB            = fra.arg(argv, 'classB,class-b');
    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr')    || (classB ? `10.${classB}.0.0/16` : argv.cidr);
    const adjective         = fra.arg(argv, 'adjective,adj');
    const InstanceTenancy   = 'default';

    const AmazonProvidedIpv6CidrBlock = true;

    const reqd = { CidrBlock };
    if (fra.argErrors(reqd))    { return fra.abort(); }

    var   vpc;
    var   VpcId;

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      // See if we already have it
      return describeVpcs({classB, CidrBlock}, fra.opts({}), function(err, data) {

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
          return tag({type:'Vpc', id: VpcId, rawTags: defaultTags, adjective}, context, function(err, data) {
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
        return describeVpcs({VpcId}, fra.opts({}), function(err, data) {

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
  const { fra }   = (ractx.quickNetVpc__upsertSubnet || ractx);

  return fra.iwrap(function(abort, calling) {
    const {
      createSubnet,
      modifySubnetAttribute
    }                             = libAws.awsFns(ec2, 'createSubnet,modifySubnetAttribute', fra.opts({}), abort);
    const { describeSubnets }     = fra.loads(libDescribeVpc, 'describeSubnets', fra.opts({}), abort);

    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr', {required:true});
    const VpcId             = fra.arg(argv, 'VpcId,vpc');
    const AvailabilityZone  = fra.arg(argv, 'AvailabilityZone,az', {required:true});
    const publicIp          = fra.arg(argv, 'publicIp,public-ip,public');
    const kind              = fra.arg(argv, 'kind');
    const Name              = fra.arg(argv, 'name') || (kind? kind.name : null);
    const adjective         = fra.arg(argv, 'adjective,adj');

    if (fra.argErrors())    { return fra.abort(); }

    var   SubnetId;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeSubnets(fra.opts({CidrBlock, VpcId}), fra.opts({}), function(err, data) {

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
          return tag({type:'Subnet', id: SubnetId, rawTags: defaultTags, tags, adjective}, context, function(err, data) {
            if (!sg.ok(err, data))  { console.error(err); }

            return next();
          });
        });

      }, function(next) {
        var   params = {SubnetId};

        if (publicIp)   { params.MapPublicIpOnLaunch = {Value:true} };

        if (sg.numKeys(params) <= 1)    { return next(); }

        return modifySubnetAttribute(params, {abort:false}, function(err, data) {
          return next();
        });

      }, function(next) {
        return describeSubnets({SubnetId}, fra.opts({}), function(err, data) {

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
  const { fra }   = (ractx.quickNetVpc__upsertSecurityGroup || ractx);

  return fra.iwrap(function(abort, calling) {
    const { describeSecurityGroups, createSecurityGroup } = libAws.awsFns(ec2, 'describeSecurityGroups,createSecurityGroup', fra.opts({}), abort);

    const VpcId             = fra.arg(argv, 'VpcId,vpc', {required:true});
    const GroupName         = fra.arg(argv, 'GroupName,name', {required:true});
    const Description       = fra.arg(argv, 'Description,desc', {required:false});
    const adjective         = fra.arg(argv, 'adjective,adj');

    if (fra.argErrors())    { return fra.abort(); }

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
          return tag({type:'SecurityGroup', id: my.result.GroupId, rawTags: defaultTags, tags:{Name: GroupName}, adjective}, context, function(err, data) {
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
  const { fra }   = (ractx.quickNetVpc__upsertSecurityGroupIngress || ractx);

  return fra.iwrap(function(abort) {
    const { authorizeSecurityGroupIngress, describeSecurityGroups } = libAws.awsFns(ec2, 'authorizeSecurityGroupIngress,describeSecurityGroups', fra.opts({}), abort);

    const GroupId           = fra.arg(argv, 'GroupId,id', {required:true});
    const IpProtocol        = fra.arg(argv, 'protocol,proto', {required:false, def: 'tcp'});
    const CidrIp            = fra.arg(argv, 'CidrIp,cidr', {required:false});
    const FromPort          = fra.arg(argv, 'FromPort,from', {required:true});
    const ToPort            = fra.arg(argv, 'ToPort,to', {required:true});
    const Description       = fra.arg(argv, 'Description,desc', {required:false});
    const ingressGroupId    = fra.arg(argv, 'ingressGroupId,ingroup,insg');
    const adjective         = fra.arg(argv, 'adjective,adj');

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
  const { fra }   = (ractx.quickNetVpc__allocateAddress || ractx);

  return fra.iwrap(function(abort, calling) {
    const { allocateAddress, describeAddresses } = libAws.awsFns(ec2, 'allocateAddress,describeAddresses', fra.opts({}), abort);

    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:false});
    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:false});
    const adjective         = fra.arg(argv, 'adjective,adj');

    if (fra.argErrors())    { return fra.abort(); }

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
        return tag({type:'ElasticIp', id: my.result.AllocationId, rawTags: defaultTags, tags:{VpcId,SubnetId}, adjective}, context, function(err, data) {
          if (!sg.ok(err, data))  { console.error(err); }

          return next();
        });
      });

    }, function(my, next) {

      // Some APIs, like this one give errors when you try to do it again. It is easier
      // in this case to just handle the error, than to try to determine if we already have this one.

      return describeAddresses(awsFilters({"tag:VpcId":[VpcId],"tag:SubnetId":[SubnetId]}), {abort:false}, function(err, data) {
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

  // ra invoke packages\quick-net\lib\ec2\vpc.js createInternetGateway --vpc=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.quickNetVpc__createInternetGateway || ractx);

  return fra.iwrap(function(abort) {
    const {
      createInternetGateway,
      attachInternetGateway,
      describeInternetGateways
    } = libAws.awsFns(ec2, 'createInternetGateway,attachInternetGateway,describeInternetGateways', fra.opts({}), abort);

    var   InternetGatewayId;
    const VpcId             = fra.arg(argv, 'VpcId,vpc', {required:true});
    const adjective         = fra.arg(argv, 'adjective,adj');

    if (fra.argErrors())    { return fra.abort(); }

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
          return tag({type:'InternetGateway', id: InternetGatewayId, rawTags: defaultTags, adjective}, context, function(err, data) {
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
  const { fra }   = (ractx.quickNetVpc__createNatGateway || ractx);

  return fra.iwrap(function(abort, calling) {
    const { createNatGateway, describeNatGateways, describeAddresses } = libAws.awsFns(ec2, 'createNatGateway,describeNatGateways,describeAddresses', fra.opts({}), abort);

    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:true});
    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:false});
    var   AllocationId        = fra.arg(argv, 'AllocationId,eip-alloc', {required:false});
    const ElasticIp           = fra.arg(argv, 'ElasticIp,eip'); // not required
    const adjective           = fra.arg(argv, 'adjective,adj');

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
      if (fra.argErrors({AllocationId}))    { return fra.abort(); }

      return createNatGateway({SubnetId, AllocationId}, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        NatGatewayId = my.result.NatGateway.NatGatewayId;
        return tag({type:'NatGateway', id: NatGatewayId, rawTags: defaultTags, tags:{SubnetId}, adjective}, context, function(err, data) {
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
  const { fra }   = (ractx.quickNetVpc__createRouteTable || ractx);

  return fra.iwrap(function(abort, calling) {
    const { createRouteTable, describeRouteTables, associateRouteTable } = libAws.awsFns(ec2, 'createRouteTable,describeRouteTables,associateRouteTable', fra.opts({}), abort);

    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:false});
    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:true});
    const public              = fra.arg(argv, 'public');
    const adjective           = fra.arg(argv, 'adjective,adj');

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

      return createRouteTable({VpcId}, function(err, data) {

        my.result   = data;
        my.created  = 1;

        // Tag it
        var   tags = {};
        if (SubnetId) { tags = { ...tags, SubnetId }; }
        if (access)   { tags = { ...tags, access }; }

        RouteTableId = my.result.RouteTable.RouteTableId;
        return tag({type:'RouteTable', id: RouteTableId, rawTags: defaultTags, tags, adjective}, context, function(err, data) {
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
  const { fra }   = (ractx.quickNetVpc__associateRouteTable || ractx);

  return fra.iwrap(function(abort, calling) {
    const { associateRouteTable } = libAws.awsFns(ec2, 'associateRouteTable', fra.opts({}), abort);

    const SubnetId            = fra.arg(argv, 'SubnetId,subnet', {required:false});
    const RouteTableId        = fra.arg(argv, 'RouteTableId,route-table,table', {required:true});
    const adjective           = fra.arg(argv, 'adjective,adj');

    if (fra.argErrors())    { return fra.abort(); }

    return associateRouteTable({SubnetId, RouteTableId}, function(err, data) {
      return callback(err, data);
    });
  });
}});

mod.xport({createRoute: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\vpc.js createRoute --cidr=0.0.0.0/0 --gw= --table=

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.quickNetVpc__createRoute || ractx);

  return fra.iwrap(function(abort) {
    const { createRoute }             = libAws.awsFns(ec2, 'createRoute', fra.opts({}), abort);

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
    const adjective                   = fra.arg(argv, 'adjective,adj');

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

    if (sg.numKeys(target) === 0 || sg.numKeys(dest) !== 1) {
      return fra.abort(`Must provide RouteTableId and one or both of [[${sg.keys(target_)}]], and one of [[${sg.keys(dest_)}]]`);
    }

    return createRoute(params, {abort:false}, function(err, data) {
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
  const { fra }   = (ractx.quickNetVpc__createVpcEndpoint || ractx);

  return fra.iwrap(function(abort, calling) {
    const { createVpcEndpoint,describeVpcEndpoints } = libAws.awsFns(ec2, 'createVpcEndpoint,describeVpcEndpoints', fra.opts({}), abort);

    const VpcId               = fra.arg(argv, 'VpcId,vpc', {required:true});
    const ServiceName         = fra.arg(argv, 'ServiceName,service', {required:true});
    const VpcEndpointType     = fra.arg(argv, 'VpcEndpointType,type', {def:'Gateway'});
    const ClientToken         = fra.arg(argv, 'ClientToken,token');
    const adjective           = fra.arg(argv, 'adjective,adj');

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

        // Cannot tag VpcEndpoints

        return next();
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
    ra invoke packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111 --sg=admin --subnet=webtier
    ra invoke packages\quick-net\packages\quick-net\lib\ec2\vpc.js getSubnets --classB=111 --sg=admin --subnet=webtier | jq . | grep Id
  */

  const classB        = argv.classB;
  const kind          = argv.kind ? argv.kind.toLowerCase() : argv.kind;
  const sgName        = argv.sg       || argv.sgName;
  const subnetName    = argv.subnet   || argv.subnetName;
  const ids           = argv.ids;

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

    if (ids) {
      result.subnets          = sg.pluck(subnets, 'SubnetId');
      result.securityGroups   = sg.pluck(securityGroups, 'GroupId');
    } else {
      result.vpcs = vpcs;
      result.subnets = subnets;
      result.securityGroups = securityGroups;
    }

    return callback(null, result);
  });

}});


