
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const utils                   = require('../lib/utils');
const libTag                  = require('../lib/ec2/tags');
const libVpc                  = require('../lib/ec2/vpc');
const libCidr                 = require('../lib/ec2/cidr');
const libDescribe             = require('../lib/ec2/vpc/describe');
const superb                  = require('superb');

const firstIpInCidr           = libCidr.firstIpInCidr;
const lastIpInCidr            = libCidr.lastIpInCidr;
const toCidr                  = libCidr.toCidr;
const bitsToNetmask           = libCidr.bitsToNetmask;
const getTag                  = utils.getTag;

const tag                     = ra.load(libTag, 'tag');
const mod                     = ra.modSquad(module, 'quickNet');

var   sgsPlus = [];
var   subnetKinds = [
  {name: 'worker',  bits:20, visibility:'private'},
  {name: 'webtier', bits:24, visibility:'public',     publicIp:true},
  {name: 'db',      bits:24, visibility:'private'},
  {name: 'util',    bits:24, visibility:'private'},
];

var   securityGroupsById = {};
const getSecurityGroupId = function(name) {
  return securityGroupsById[name];
};

mod.xport({manageVpc: function(argv, context, callback) {

  // ra invoke packages\quick-net\commands\vpcs.js manageVpc --program=ratest --az=a,b,c --classB=111
  // ra invoke packages\quick-net\commands\vpcs.js manageVpc --program=ratest --az=a     --classB=113

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.quickNet__manageVpc || ractx);

  const sgs = [...sgsPlus, () => ({
    GroupName:    'wide',
    Description:  'Available to all within data center',
    ingress: [{
      /*GroupId*/
      IpProtocol:   'tcp',
      CidrIp:       '10.0.0.0/8',
      FromPort:     0,
      ToPort:       65535,
      Description:  'All TCP from the data center'
    },{
      ingressGroupId: getSecurityGroupId('admin'),
      IpProtocol:   'tcp',
      FromPort:     22,
      ToPort:       22,
      Description:  'SSH from admin instances'
    }]
  })];

  return fra.iwrap(function(abort, calling) {

    const { describeVpcs } = fra.loads(libDescribe, 'describeVpcs', fra.opts({}), abort);
    const { upsertVpc,upsertSubnet } = fra.loads(libVpc, 'upsertVpc,upsertSubnet', fra.opts({}), abort);
    const { upsertSecurityGroup,upsertSecurityGroupIngress } = fra.loads(libVpc, 'upsertSecurityGroup,upsertSecurityGroupIngress', fra.opts({}), abort);
    const { allocateAddress } = fra.loads(libVpc, 'allocateAddress', fra.opts({}), abort);
    const { createInternetGateway,createNatGateway } = fra.loads(libVpc, 'createInternetGateway,createNatGateway', fra.opts({}), abort);
    const { createRouteTable,associateRouteTable } = fra.loads(libVpc, 'createRouteTable,associateRouteTable', fra.opts({}), abort);
    const { createRoute } = fra.loads(libVpc, 'createRoute', fra.opts({abort:false}), abort);
    const { createVpcEndpoint } = fra.loads(libVpc, 'createVpcEndpoint', fra.opts({}), abort);

    const region            = fra.arg(argv, 'region', {def: 'us-east-1'});
    const skipNat           = fra.arg(argv, 'skip-nat,skipNat,skipNats');

    var    program           = fra.arg(argv, 'program', {required:true});
    var    classB            = fra.arg(argv, 'classB,class-b', {required:true});
    var    VpcId             = fra.arg(argv, 'VpcId,vpc');
    var    vpcCidr           = fra.arg(argv, 'vpcCidr,cidr');
    var    azLetters         = fra.arg(argv, 'azLetters,az', {array:true})                     || 'a,b'.split(',');
    var    CidrBlock         = `10.${classB}.0.0/16`;
    var    adjective         = fra.arg(argv, 'adjective,adj')                                  || getSuperb();

    // if (fra.argErrors())    { return fra.abort(); }

    // var   VpcId               = null;
    var   publicRouteTable    = null;
    var   RouteTableIds       = [];
    var   internetGateway     = null;
    var   GatewayId           = null;
    var   publicSubnets       = [];
    var   privateSubnets      = [];
    var   allSubnets          = [];
    var   subnetByType        = {};

    var   ids                 = {};
    var   azItems             = {};

    var   vpc;

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      // Must figure out what vpc we are working with
      if (VpcId)           { return next(); }

      return describeVpcs({CidrBlock:vpcCidr, classB, program}, {}, function(err, data) {
        if (sg.ok(err, data)) {
          vpc       = data.Vpcs[0];
          VpcId     = (vpc || {}).VpcId;
          vpcCidr   = (vpc || {}).CidrBlock;
          adjective = _.first((getTag(vpc, 'name') || '').split('-')) || adjective;
        }

        return next();
      });

    }, function(my, next) {

      // Must figure out what program we are working with
      if (program)           { return next(); }

      if (vpc) {
        program = getTag(vpc, 'program');
      }
      if (fra.argErrors({program}))    { return fra.abort(); }

      return next();

    }, function(my, next) {
      // console.error(`init`, sg.inspect({vpc, VpcId, program, classB, vpcCidr, adjective}));
      // return callback(null, {});
      return next();

    }, function(my, next) {
      my.resources = [];

      const exampleVpcData = {
        found: 1,
        result: {
          Vpc: {
            CidrBlock: '10.111.0.0/16',
            DhcpOptionsId: 'dopt-1234567890',
            State: 'available',
            VpcId: 'vpc-1234567890',
            OwnerId: '1234567890',
            InstanceTenancy: 'default',
            Ipv6CidrBlockAssociationSet:
              [ { AssociationId: 'vpc-cidr-assoc-1234567890',
                  Ipv6CidrBlock: '2600:1f18:376:ee00::/56',
                  Ipv6CidrBlockState: { State: 'associated' } } ],
            CidrBlockAssociationSet:
              [ { AssociationId: 'vpc-cidr-assoc-1234567890',
                  CidrBlock: '10.111.0.0/16',
                  CidrBlockState: { State: 'associated' } } ],
            IsDefault: false,
            Tags: [],
          }
        }
      };


      // ---------------------------------------- Vpc ----------
      return upsertVpc({CidrBlock, adjective}, {}, function(err, data) {
        my.result.vpc = data.result;

        VpcId = data.result.Vpc.VpcId;
        my.resources.push(VpcId);
        ids.VpcId = VpcId;

        vpcCidr = CidrBlock;

        return next();
      });

    }, function(my, next) {

      const firstVpcIp            = firstIpInCidr(vpcCidr);
      var   currCidrFirst         = firstVpcIp;

      // ---------------------------------------- Subnets ----------

      // Calculate the subnet params
      var   subnetList = [];
      var   cidrBits;

      my.result.subnets = {};
      sg.__each(subnetKinds, function(kind, next) {
        const { publicIp } = kind;

        cidrBits = kind.bits;
        sg.__each(azLetters, function(letter, next) {
          const AvailabilityZone  = `${region}${letter}`;

          // Make sure the subnet cidr fits
          var   CidrBlock         = toCidr(currCidrFirst, bitsToNetmask(cidrBits));
          if (currCidrFirst !== firstIpInCidr(CidrBlock)) {
            currCidrFirst = lastIpInCidr(CidrBlock) + 1;
            CidrBlock     = toCidr(currCidrFirst, bitsToNetmask(cidrBits));
          }

          subnetList.push({VpcId, CidrBlock, AvailabilityZone, publicIp, kind, adjective});

          currCidrFirst = lastIpInCidr(CidrBlock) + 1;
          return next();

        }, function() {
          return next();
        });
      }, function() {

        const exampleSubnetData = {
          found: 1,
          result: {
            Subnet: {
              AvailabilityZone: 'us-east-1b',
              AvailabilityZoneId: 'use1-az6',
              AvailableIpAddressCount: 250,
              CidrBlock: '10.111.1.0/24',
              DefaultForAz: false,
              MapPublicIpOnLaunch: true,
              State: 'available',
              SubnetId: 'subnet-1234567890',
              VpcId: 'vpc-1234567890',
              OwnerId: '1234567890',
              AssignIpv6AddressOnCreation: false,
              Ipv6CidrBlockAssociationSet: [],
              Tags: [],
              SubnetArn: 'arn:aws:ec2:us-east-1:1234567890:subnet/subnet-1234567890'
            }
          }
        };

        sg.__eachll(subnetList, function(subnet, next) {
          const { AvailabilityZone, publicIp, kind }  = subnet;
          const { name, visibility }                  = kind;

          // ----- Create the subnets
          return upsertSubnet(subnet, {}, function(err, data) {
            my.result.subnets[AvailabilityZone] = data.result;
            my.resources.push(data.result.Subnet.SubnetId);

            if (publicIp) {
              publicSubnets.push(data.result.Subnet);
            } else {
              privateSubnets.push(data.result.Subnet);
            }
            allSubnets.push(data.result.Subnet);
            subnetByType[name] =  subnetByType[name] || [];
            subnetByType[name].push(data.result.Subnet);

            sg.setOn(azItems, [AvailabilityZone, 'subnets', name], data.result.Subnet);

            return next();
          });
        }, function() {
          return next();
        });
      });

    }, function(my, next) {
      // ---------------------------------------- Security Groups ----------
      return sg.__run(next, [function(next) {

        my.result.securityGroups = {};
        return sg.__each(sgs, function(getSecGroup, next) {
          const secGroup = getSecGroup();
          const { GroupName, Description, ingress } = secGroup;

          return upsertSecurityGroup({VpcId, GroupName, Description, adjective}, {}, function(err, data) {
            const { GroupId } = data.result.SecurityGroup;
            my.result.securityGroups[GroupName] = data.result;
            my.resources.push(GroupId);
            securityGroupsById[GroupName] = GroupId;

            return sg.__each(ingress, function(rule, next) {
              return upsertSecurityGroupIngress({GroupId, adjective, ...rule}, {}, function(err, data) {
                return next();
              });
            }, function() {
              return next();
            });
          });

        }, function() {
          return next();
        });

      }, function(next) {
        return next();
      }]);

    }, function(my, next) {
      if (skipNat)  { return next(); }

      // ---------------------------------------- Gateway / NAT ----------
      my.result.natGateways = {};
      my.result.addresses = {};
      return createInternetGateway({VpcId, adjective}, {}, function(err, data) {
        const { InternetGatewayId } = data.result.InternetGateway;
        my.result.internetGateway = data.result;
        my.resources.push(InternetGatewayId);

        GatewayId       = InternetGatewayId;
        internetGateway = data.result.InternetGateway;

        return sg.__eachll(publicSubnets, function(subnet, next) {
          const { SubnetId, AvailabilityZone } = subnet;

          return allocateAddress({VpcId, SubnetId, adjective}, {}, function(err, data) {
            const { AllocationId } = data.result.Address;
            my.result.addresses[AvailabilityZone] = data.result;
            my.resources.push(AllocationId);

            return createNatGateway({VpcId, SubnetId, adjective}, {}, function(err, data) {
              const { NatGatewayId } = data.result.NatGateway;
              my.result.natGateways[AvailabilityZone] = data.result;
              my.resources.push(NatGatewayId);

              sg.setOn(azItems, [AvailabilityZone,  'NatGateway'], data.result.NatGateway);

              return next();
            });
          });
        }, function() {
          return next();
        });
      });

    }, function(my, next) {
      if (skipNat)  { return next(); }

      // ---------------------------------------- Public Route Table ----------
      return createRouteTable({VpcId, public:true, adjective}, {}, function(err, data) {
        // console.error(`crt`, sg.inspect({err, data, publicSubnets, privateSubnets}));

        const { RouteTableId } = data.result.RouteTable;
        my.resources.push(RouteTableId);
        RouteTableIds.push(RouteTableId);
        publicRouteTable = data.result.RouteTable;

        return createRoute({RouteTableId, GatewayId, DestinationCidrBlock:'0.0.0.0/0', adjective}, {}, function(err, data) {
          return sg.__eachll(publicSubnets, function(subnet, next) {
            const { SubnetId, AvailabilityZone } = subnet;

            return associateRouteTable({SubnetId, RouteTableId, adjective}, {}, function(err, data) {
              return next();
            });
          }, function() {
            return next();
          });
        });
      });

    }, function(my, next) {
      if (skipNat)  { return next(); }

      // ---------------------------------------- Private Route Tables ----------

      return sg.__eachll(privateSubnets, function(subnet, next) {
        const { SubnetId, AvailabilityZone } = subnet;

        return createRouteTable({VpcId, SubnetId, adjective}, {}, function(err, data) {

          const { RouteTableId } = data.result.RouteTable;
          my.resources.push(RouteTableId);
          RouteTableIds.push(RouteTableId);

          const { NatGatewayId } = sg.deref(azItems, [AvailabilityZone,  'NatGateway']);
          return createRoute({RouteTableId, NatGatewayId, DestinationCidrBlock:'0.0.0.0/0', adjective}, {}, function(err, data) {
            return associateRouteTable({SubnetId, RouteTableId, adjective}, {}, function(err, data) {
              return next();
            });
          });
        });

      }, function() {
        return next();
      });

    }, function(my, next) {
      if (skipNat)  { return next(); }

      // ---------------------------------------- Vpc Endpoints ----------
      var   ServiceName = `com.amazonaws.${region}.s3`;
      return createVpcEndpoint({VpcId,ServiceName,RouteTableIds,adjective}, {}, function(err, data) {

        var   ServiceName = `com.amazonaws.${region}.dynamodb`;
        return createVpcEndpoint({VpcId,ServiceName,RouteTableIds,adjective}, {}, function(err, data) {

          return next();
        });
      });
    }, function(my, next) {
      // ---------------------------------------- Vpc Interface Endpoints ----------
      const VpcEndpointType     = 'Interface';
      const PrivateDnsEnabled   = true;
      const SubnetIds           = sg.pluck(subnetByType.worker, 'SubnetId');

      return sg.__run2(next, [function(next) {
        // ----------------------Vpc Interface Endpoints for ECR
        const SecurityGroupIds    = [my.result.securityGroups.ECR_endpoint.SecurityGroup.GroupId];
        const endpoints           = 'ecr.api,ecr.dkr'.split(',');

        return sg.__each(endpoints, function(endpoint, next) {
          const ServiceName = `com.amazonaws.${region}.${endpoint}`;
          return createVpcEndpoint({VpcId,VpcEndpointType,ServiceName,SubnetIds,SecurityGroupIds,PrivateDnsEnabled,adjective}, {}, function(err, data) {

            return next();
          });
        }, next);

      }, function(next) {
        // ----------------------Vpc Interface Endpoints for ECS
        const SecurityGroupIds    = [my.result.securityGroups.ECS_endpoint.SecurityGroup.GroupId];
        const endpoints           = 'ecs-agent,ecs-telemetry,ecs'.split(',');

        return sg.__each(endpoints, function(endpoint, next) {
          const ServiceName = `com.amazonaws.${region}.${endpoint}`;
          return createVpcEndpoint({VpcId,VpcEndpointType,ServiceName,SubnetIds,SecurityGroupIds,PrivateDnsEnabled,adjective}, {}, function(err, data) {

            return next();
          });
        }, next);


      }, function(next) {
        // ----------------------Vpc Interface Endpoints for KMS
        const SecurityGroupIds    = [my.result.securityGroups.KMS_endpoint.SecurityGroup.GroupId];
        const endpoints           = 'kms'.split(',');

        return sg.__each(endpoints, function(endpoint, next) {
          const ServiceName = `com.amazonaws.${region}.${endpoint}`;
          return createVpcEndpoint({VpcId,VpcEndpointType,ServiceName,SubnetIds,SecurityGroupIds,PrivateDnsEnabled,adjective}, {}, function(err, data) {

            return next();
          });
        }, next);

      }, function(next) {
        // ----------------------Vpc Interface Endpoints for SNS
        const SecurityGroupIds    = [my.result.securityGroups.SNS_endpoint.SecurityGroup.GroupId];
        const endpoints           = 'sns'.split(',');

        return sg.__each(endpoints, function(endpoint, next) {
          const ServiceName = `com.amazonaws.${region}.${endpoint}`;
          return createVpcEndpoint({VpcId,VpcEndpointType,ServiceName,SubnetIds,SecurityGroupIds,PrivateDnsEnabled,adjective}, {}, function(err, data) {

            return next();
          });
        }, next);

      }, function(next) {
        // ----------------------Vpc Interface Endpoints for SQS
        const SecurityGroupIds    = [my.result.securityGroups.SQS_endpoint.SecurityGroup.GroupId];
        const endpoints           = 'sqs'.split(',');

        return sg.__each(endpoints, function(endpoint, next) {
          const ServiceName = `com.amazonaws.${region}.${endpoint}`;
          return createVpcEndpoint({VpcId,VpcEndpointType,ServiceName,SubnetIds,SecurityGroupIds,PrivateDnsEnabled,adjective}, {}, function(err, data) {

            return next();
          });
        }, next);

      }, function(next) {
        // ----------------------Vpc Interface Endpoints for SecretsManager
        const SecurityGroupIds    = [my.result.securityGroups.secretsmanager_endpoint.SecurityGroup.GroupId];
        const endpoints           = 'secretsmanager'.split(',');

        return sg.__each(endpoints, function(endpoint, next) {
          const ServiceName = `com.amazonaws.${region}.${endpoint}`;
          return createVpcEndpoint({VpcId,VpcEndpointType,ServiceName,SubnetIds,SecurityGroupIds,PrivateDnsEnabled,adjective}, {}, function(err, data) {

            return next();
          });
        }, next);

      }, function(next) {
        // ----------------------Vpc Interface Endpoints for ec2, ec2-messages
        const SecurityGroupIds    = [my.result.securityGroups.ec2_endpoint.SecurityGroup.GroupId];
        const endpoints           = 'ec2,ec2messages'.split(',');

        return sg.__each(endpoints, function(endpoint, next) {
          const ServiceName = `com.amazonaws.${region}.${endpoint}`;
          return createVpcEndpoint({VpcId,VpcEndpointType,ServiceName,SubnetIds,SecurityGroupIds,PrivateDnsEnabled,adjective}, {}, function(err, data) {

            return next();
          });
        }, next);

        // TODO: endpoints for: elastic-inference, elasticloadbalancer, events?, execute-api, kinesis-streams, kms

      }, function(next) {
        return next();
      }]);

    }, function(my, next) {
      // console.error(`intdata`, sg.inspect({VpcId,vpcCidr,publicRouteTable,RouteTableIds,internetGateway,publicSubnets,privateSubnets,azItems}));

      return next();

    }, function(my, next) {
      const { resources } = my;
      return tag({resources, tags: {program}}, context, function(err, data) {
        if (!sg.ok(err, data))  { console.error(err); }

        return next();
      });
    }]);
  });
}});

mod.xport({launchInfo: function(argv, context, callback) {

  // ra invoke packages\quick-net\commands\vpcs.js launchInfo --classB=111 --sg=web --subnet=webtier

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx.quickNet__launchInfo;

  return fra.iwrap(function(abort) {
    const { getSubnets } = fra.loads(libVpc, 'getSubnets', fra.opts({}), abort);

    const classB            = ''+fra.arg(argv, 'classB,b', {required:true});
    const sgName            = fra.arg(argv, 'sgName,sg');
    const subnetName        = fra.arg(argv, 'subnetName,subnet');
    const azLetter          = fra.arg(argv, 'azLetter,az');

    if (fra.argErrors())    { return fra.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      // [[You only need fra.ops on one of these params]]
      return getSubnets(fra.opts({classB, sgName, subnetName}), fra.opts({}), function(err, data) {

        if (azLetter) {
          my.result.subnets = sg.reduce(data.subnets, [], (m, subnet) => {
            if (!subnet.AvailabilityZone.endsWith(azLetter)) { return m; }
            return sg.ap(m, subnet.SubnetId);
          });
        } else {
          my.result.subnets = sg.reduce(data.subnets, [], (m, subnet) => {
            return sg.ap(m, {az:subnet.AvailabilityZone, id:subnet.SubnetId});
          });
        }

        my.result.securityGroups = sg.reduce(data.securityGroups, [], (m, securityGroup) => {
          return sg.ap(m, securityGroup.GroupId);
        });

        return next();
      });
    }, function(my, next) {
      return next();
    }]);
  });
}});

sgsPlus = [() => ({
  GroupName:    'lambda',
  Description:  'An sg to identify lambda fns',
  ingress: []
}), () => ({
  GroupName:    'admin',
  Description:  'Open for SSH',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '0.0.0.0/0',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '0.0.0.0/0',
    FromPort:     443,
    ToPort:       443,
    Description:  'SSH over HTTPS'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     80,
    ToPort:       80,
    Description:  'HTTP for webtier to expose'
  }]
}), () => ({
  GroupName:    'devOps',
  Description:  'Open for SSH, temp IPs',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '98.176.46.246/24',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from my house'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '98.176.46.246/24',
    FromPort:     443,
    ToPort:       443,
    Description:  'SSH over HTTPS from my house'
  }]
}), () => ({
  GroupName:    'web',
  Description:  'Open for HTTP(S)',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '0.0.0.0/0',
    FromPort:     80,
    ToPort:       80,
    Description:  'All HTTP'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '0.0.0.0/0',
    FromPort:     443,
    ToPort:       443,
    Description:  'All HTTPS'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  }]
}), () => ({
  GroupName:    'worker',
  Description:  'Open at many high ports',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     7000,
    ToPort:       9999,
    Description:  'All HTTP'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  }]
}), () => ({
  GroupName:    'container_hosts',
  Description:  'Open at many high ports',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     7000,
    ToPort:       9999,
    Description:  'All HTTP'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  }]
}), () => ({
  GroupName:    'ECS_endpoint',
  Description:  'Access to ECS Endpoint',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'ECS Endpoint Access'
  }]
}), () => ({
  GroupName:    'ECR_endpoint',
  Description:  'Access to ECR Endpoint',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'ECR Endpoint Access'
  }]
}), () => ({
  GroupName:    'KMS_endpoint',
  Description:  'Access to KMS Endpoint',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'KMS Endpoint Access'
  }]
}), () => ({
  GroupName:    'STS_endpoint',
  Description:  'Access to STS Endpoint',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'STS Endpoint Access'
  }]
}), () => ({
  GroupName:    'SQS_endpoint',
  Description:  'Access to SQS Endpoint',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'SQS Endpoint Access'
  }]
}), () => ({
  GroupName:    'SNS_endpoint',
  Description:  'Access to SNS Endpoint',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'SNS Endpoint Access'
  }]
}), () => ({
  GroupName:    'secretsmanager_endpoint',
  Description:  'Access to SecretsManager Endpoint',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'SecretsManager Endpoint Access'
  }]
}), () => ({
  GroupName:    'ec2_endpoint',
  Description:  'Access to ec2,ec2-messages Endpoints',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'ec2 Endpoint Access'
  }]
})];


function getSuperb() {
  var   adj = superb.random();
  while (!adj.match(/^[a-z]+$/)) {
    adj = superb.random();
  }
  return adj;
}
