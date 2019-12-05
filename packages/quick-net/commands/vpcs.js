if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 */


// For NAT Gateway vs. NAT Instance
// See:
// * https://www.theguild.nl/cost-saving-with-nat-instances/
// * https://docs.aws.amazon.com/vpc/latest/userguide/VPC_NAT_Instance.html
// * https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-comparison.html

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const utils                   = require('../lib/utils');
const libTag                  = require('../lib/ec2/tags');
const libVpc                  = require('../lib/ec2/vpc');
const libEc2                  = require('../lib/ec2/ec2');
const libCidr                 = require('../lib/ec2/cidr');
const libDescribe             = require('../lib/ec2/vpc/describe');
const awsDefs                 = require('../lib/aws-defs');
const AWS                     = require('aws-sdk');
const superb                  = require('superb');

const firstIpInCidr           = libCidr.firstIpInCidr;
const lastIpInCidr            = libCidr.lastIpInCidr;
const toCidr                  = libCidr.toCidr;
const bitsToNetmask           = libCidr.bitsToNetmask;
const getTag                  = utils.getTag;

const tag                     = ra.load(libTag, 'tag');
const mod                     = ra.modSquad(module, 'quickNet');

const config                  = new AWS.Config({paramValidation:false, region:'us-east-1', ...awsDefs.options});
const ec2                     = new AWS.EC2(config);

var   sgsPlus = [];
var   subnetKinds = [
  {name: 'worker',  bits:20, visibility:'private'},
  {name: 'webtier', bits:24, visibility:'public',     publicIp:true,   nat:true},
  {name: 'admin',   bits:24, visibility:'public',     publicIp:true},
  {name: 'db',      bits:24, visibility:'private'},
  {name: 'util',    bits:24, visibility:'private'},
];

var   securityGroupsById = {};
const getSecurityGroupId = function(name) {
  return securityGroupsById[name];
};

mod.xport({manageVpc: function(argv, context, callback) {

  // ra invoke2 commands\vpcs.js manageVpc --program=ratest   --az=a,b,c --classB=111
  // ra invoke2 commands\vpcs.js manageVpc --program=ratest   --az=a     --classB=113
  // ra invoke2 commands\vpcs.js manageVpc --program=qnettest --az=c     --classB=21   --skip-nat --skip-endpoint-services
  // ra invoke2 commands\vpcs.js manageVpc --adj=wicked --program=bcsnet --namespace=bcs --az= c d  --nat-instance --skip-endpoint-services --classB=11

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.quickNet__manageVpc || ractx);

  var   sgs = [...sgsPlus, () => ({
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
    },{
      ingressGroupId: getSecurityGroupId('access'),
      IpProtocol:   'tcp',
      FromPort:     22,
      ToPort:       22,
      Description:  'SSH from bastion instances'
    },{
      ingressGroupId: getSecurityGroupId('devOps'),
      IpProtocol:   'tcp',
      FromPort:     22,
      ToPort:       22,
      Description:  'SSH from devOps instances'
      }]
  })];

  sgs = [...sgs, () => ({
    GroupName:    'worldssh',
    Description:  'Ssh for everyone',
    ingress: [{
      /*GroupId*/
      IpProtocol:   'tcp',
      CidrIp:       '0.0.0.0/0',
      FromPort:     22,
      ToPort:       22,
      Description:  'ssh'
    }]
  })];

  return fra.iwrap(function(abort, calling) {

    const { upsertInstance } = fra.loads(libEc2, 'upsertInstance', fra.opts({}), abort);
    const { describeVpcs } = fra.loads(libDescribe, 'describeVpcs', fra.opts({}), abort);
    const { upsertVpc,upsertSubnet } = fra.loads(libVpc, 'upsertVpc,upsertSubnet', fra.opts({}), abort);
    const { upsertSecurityGroup,upsertSecurityGroupIngress } = fra.loads(libVpc, 'upsertSecurityGroup,upsertSecurityGroupIngress', fra.opts({}), abort);
    const { allocateAddress } = fra.loads(libVpc, 'allocateAddress', fra.opts({}), abort);
    const { createInternetGateway,createNatGateway } = fra.loads(libVpc, 'createInternetGateway,createNatGateway', fra.opts({}), abort);
    const { createRouteTable,associateRouteTable } = fra.loads(libVpc, 'createRouteTable,associateRouteTable', fra.opts({}), abort);
    const { createRoute,deleteRoute } = fra.loads(libVpc, 'createRoute,deleteRoute', fra.opts({abort:false}), abort);
    const { createVpcEndpoint } = fra.loads(libVpc, 'createVpcEndpoint', fra.opts({}), abort);

    const region                  = fra.arg(argv, 'region', {def: 'us-east-1'});
    const skipNat                 = fra.arg(argv, 'skip_nat,skipNat,skipNats');
    const natInstance             = fra.arg(argv, 'nat_instance,natInstance');
    const skipEndpoints           = fra.arg(argv, 'skip_endpoints,skipEndpoint,skipEndpoints');
    const skipEndpointServices    = fra.arg(argv, 'skip_endpoint_services,skipEndpointServices');

    var    program                 = fra.arg(argv, 'program', {required:true});
    var    classB                  = fra.arg(argv, 'classB,class-b', {required:true});
    var    VpcId                   = fra.arg(argv, 'VpcId,vpc');
    var    vpcCidr                 = fra.arg(argv, 'vpcCidr,cidr');
    var    azLetters               = fra.arg(argv, 'azLetters,az', {array:true})                     || 'a,b'.split(',');
    var    CidrBlock               = `10.${classB}.0.0/16`;
    var    adjective               = fra.arg(argv, 'adjective,adj')                                  || getSuperb();
    var    suffix                  = fra.arg(argv, 'suffix');

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

    var   primaryaz           = (azLetters || ['a'])[0];
    var   ids                 = {};
    var   azItems             = {};

    // ------------------------------ Fixup inputs ------------------------------

    // If we do not have a NAT, make all the subnets public, with IP addresses
    if (skipNat) {
      subnetKinds = sg.reduce(subnetKinds, [], (m, kind) => {
        return [...m, {...kind, visibility:'public', publicIp:true, nat:false}];
      });
    }

    // If the caller wants endpoint services, which require sgs
    if (!skipEndpointServices) {
      sgs = [...sgs, ...sgsForEndpointServices];
    }

    // ------------------------------ GO ------------------------------
    var   vpc;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      // ---------------------------------------- Existing Vpc? ----------

      // Must figure out what vpc we are working with
      if (VpcId)           { return next(); }

      return describeVpcs({CidrBlock:vpcCidr, classB, program}, {}, function(err, data) {
        if (sg.ok(err, data)) {
          vpc       = data.Vpcs[0];
          VpcId     = (vpc || {}).VpcId;
          vpcCidr   = (vpc || {}).CidrBlock;
          adjective = _.first((getTag(vpc, 'name') || '').split('-')) || adjective;

          sg.elog(`described VPC: ${adjective}-Vpc`, {CidrBlock: vpcCidr, VpcId});
        }

        return next();
      });

    }, function(my, next) {

      // ---------------------------------------- Existing program name ----------

      // Must figure out what program we are working with
      if (program)           { return next(); }

      if (vpc) {
        program = getTag(vpc, 'program');
      }
      if (fra.argErrors({program}))    { return fra.abort(); }

      return next();

    }, function(my, next) {
      my.resources = [];

      // ---------------------------------------- Upsert Vpc ----------

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

      sg.elog(`upserting VPC: ${adjective}-Vpc`, {CidrBlock});
      return upsertVpc({CidrBlock, adjective}, {}, function(err, data) {
        my.result.vpc = data.result;

        VpcId = data.result.Vpc.VpcId;
        my.resources.push(VpcId);
        ids.VpcId = VpcId;

        vpcCidr = CidrBlock;

        sg.elog(`upserted VPC: ${adjective}-Vpc`, {CidrBlock, VpcId});

        // Tag it
        return ec2.createTags({
          Resources : [VpcId],
          Tags      : [
            {Key:'quicknet:primaryaz', Value: primaryaz}
          ]
        }, next);

      });

    }, function(my, next) {

      // ---------------------------------------- Compute Subnet config ----------

      const firstVpcIp            = firstIpInCidr(vpcCidr);
      var   currCidrFirst         = firstVpcIp;

      // Calculate the subnet params (build up `subnetList`)
      var   subnetList = [];
      var   cidrBits;

      my.result.subnets = [];
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

          const suffix = `zone${letter.toUpperCase()}`;
          subnetList.push({VpcId, CidrBlock, AvailabilityZone, publicIp, kind, adjective, suffix});

          currCidrFirst = lastIpInCidr(CidrBlock) + 1;
          return next();

        }, next);
      }, function() {

      // ---------------------------------------- Upsert Subnets ----------

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
          sg.elog(`upserting subnet: ${adjective}-${name}-${AvailabilityZone}`, {CidrBlock, subnet});
          return upsertSubnet(subnet, {}, function(err, data) {
            // my.result.subnets[AvailabilityZone] = data.result;
            my.result.subnets.push(data.result.Subnet);

            my.resources.push(data.result.Subnet.SubnetId);

            if (publicIp) {
              publicSubnets.push({...subnet, ...data.result.Subnet});
            } else {
              privateSubnets.push({...subnet, ...data.result.Subnet});
            }
            allSubnets.push(data.result.Subnet);
            subnetByType[name] =  subnetByType[name] || [];
            subnetByType[name].push(data.result.Subnet);

            sg.setOn(azItems, [AvailabilityZone, 'subnets', name], data.result.Subnet);

            // Tag it
            const Tags = [
              {Key:'visibility', Value: visibility}
            ];

            return ec2.createTags({Resources : [data.result.Subnet.SubnetId], Tags}, function() {
              sg.elog(`upserted subnet: ${adjective}-${name}-${AvailabilityZone}`, {CidrBlock, subnet: data.result.Subnet});
              return next();
            });

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

          sg.elog(`upserting sg: ${adjective}-${GroupName}`, {GroupName, Description});
          return upsertSecurityGroup({VpcId, GroupName, Description, adjective}, {}, function(err, data) {
            const { GroupId } = data.result.SecurityGroup;
            my.result.securityGroups[GroupName] = data.result;
            my.resources.push(GroupId);
            securityGroupsById[GroupName] = GroupId;

            return sg.__each(ingress, function(rule, next) {
              return upsertSecurityGroupIngress({GroupId, adjective, ...rule}, {}, function(err, data) {
                sg.elog(`upserted sg and rule: ${adjective}-${GroupName}`, {GroupName, rule});
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
      // if (skipNat)  { return next(); }

      // ---------------------------------------- Gateway / NAT ----------
      my.result.natGateways   = {};
      my.result.natInstances  = {};
      my.result.addresses     = {};

      sg.elog(`upserting internetGateway: ${adjective}-IG`);
      return createInternetGateway({VpcId, adjective}, {}, function(err, data) {
        const { InternetGatewayId } = data.result.InternetGateway;
        my.result.internetGateway = data.result;
        my.resources.push(InternetGatewayId);

        GatewayId       = InternetGatewayId;
        internetGateway = data.result.InternetGateway;

        sg.elog(`upserted internetGateway: ${adjective}-IG`, {InternetGatewayId});

        return sg.__eachll(publicSubnets, function(subnet, next) {
          const { SubnetId, AvailabilityZone }  = subnet;
          const   suffix                        = zoneSuffix(AvailabilityZone);

          // if (skipNat) { return next(); }
          if (!subnet.kind.nat) { return next(); }

          // TODO: for natInstance, launch instance
          if (natInstance) {
            const instParams = {distro: 'ubuntu', uniqueName: `NATInst-${suffix}-${classB}`, instanceType: 't3.nano', classB, AvailabilityZone,
              key: `${program}-access`, SecurityGroupIds: getSecurityGroupId('access'), SubnetId, iamName: `${program}-access-instance-role`,
              userdataOpts: {INSTALL_DOCKER:false, INSTALL_AGENTS:false, INSTALL_NAT:'1'},
              SourceDestCheck: false,
            };
            return upsertInstance(instParams, {}, function(err, data) {
              var instance = data.result.Instance;

              instance.NatInstanceId = instance.InstanceId;

              // TODO: Get IP of instance
              // TODO: Put instance Id into azItems

              my.result.natInstances[AvailabilityZone] = instance;
              my.resources.push(instance.InstanceId);

              sg.setOn(azItems, [AvailabilityZone,  'NatInstance'], instance);
              return next();
            });
          }

          /* otherwise -- nat gateway */
          return allocateAddress({VpcId, SubnetId, adjective, suffix}, {}, function(err, data) {
            const { AllocationId } = data.result.Address;
            my.result.addresses[AvailabilityZone] = data.result;
            my.resources.push(AllocationId);

            return createNatGateway({VpcId, SubnetId, adjective, suffix}, {}, function(err, data) {
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
      // if (skipNat)  { return next(); }

      // ---------------------------------------- Public Route Table ----------
      return createRouteTable({VpcId, public:true, adjective, suffix:'public'}, {}, function(err, data) {
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
      // if (skipNat)  { return next(); }

      // ---------------------------------------- Private Route Tables ----------

      return sg.__eachll(privateSubnets, function(subnet, next) {
        const { SubnetId, AvailabilityZone, kind={} } = subnet;
        const   suffix                                = `${kind.name}-${zoneSuffix(AvailabilityZone)}`;

        return createRouteTable({VpcId, SubnetId, adjective, suffix}, {}, function(err, data) {

          const { RouteTable }    = data.result;
          const { RouteTableId }  = RouteTable;
          my.resources.push(RouteTableId);
          RouteTableIds.push(RouteTableId);

          if (skipNat) { return next(); }

          // Might need to delete already-existing route to NAT (if a NAT instance was terminated)
          return deleteOldNatRoute(function(err) {

            // Route private route tables to natInstance
            if (natInstance) {
              const { InstanceId } = sg.deref(azItems, [AvailabilityZone,  'NatInstance']);
              return createRoute({RouteTableId, InstanceId, DestinationCidrBlock:'0.0.0.0/0', adjective, suffix}, {}, function(err, data) {
                return associateRouteTable({SubnetId, RouteTableId, adjective, suffix}, {}, function(err, data) {
                  return next();
                });
              });
            }

            /* otherwise */
            const { NatGatewayId } = sg.deref(azItems, [AvailabilityZone,  'NatGateway']);
            return createRoute({RouteTableId, NatGatewayId, DestinationCidrBlock:'0.0.0.0/0', adjective, suffix}, {}, function(err, data) {
              return associateRouteTable({SubnetId, RouteTableId, adjective, suffix}, {}, function(err, data) {
                return next();
              });
            });
          });

          function deleteOldNatRoute(callback) {
            return sg.__each(RouteTable.Routes || [], function(route, next) {
              if (route.DestinationCidrBlock !== '0.0.0.0/0') { return next(); }

              const params = sg.extend({RouteTableId, DestinationCidrBlock:'0.0.0.0/0'});
              return deleteRoute(params, {}, function(err, data) {
                return next();
              });
            }, function() {
              return callback();
            });
          }
        });

      }, function() {
        return next();
      });

    }, function(my, next) {
      // if (skipNat)  { return next(); }

      // ---------------------------------------- Vpc Endpoints ----------
      var   ServiceName = `com.amazonaws.${region}.s3`;
      const suffix      = _.last(ServiceName.split('.'));
      return createVpcEndpoint({VpcId,ServiceName,RouteTableIds,adjective,suffix}, {}, function(err, data) {

        var   ServiceName = `com.amazonaws.${region}.dynamodb`;
        const suffix      = _.last(ServiceName.split('.'));
        return createVpcEndpoint({VpcId,ServiceName,RouteTableIds,adjective,suffix}, {}, function(err, data) {

          return next();
        });
      });

    }, function(my, next) {
      if (skipEndpointServices)  { return next(); }

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

        my.result.vpcIds = sg.reduce(data.vpcs, [], (m, vpc) => {
          return sg.ap(m, vpc.VpcId);
        });

        return next();
      });
    }, function(my, next) {
      return next();
    }]);
  });
}});

mod.async({getVpcSubnetsSgs: async function(argv, context) {
  return await _getVpcSubnetsSgs_(argv);
}});

async function _getVpcSubnetsSgs_(argv) {
  var   vpc,subnets,sgs;
  var   vpcId         = argv.vpc;
  var   subnetIds     = sg.arrayify(argv.subnets  || argv.subnet);
  var   sgIds         = sg.arrayify(argv.sgs      || argv.security_groups);

  // Do we already have it?
  if (vpcId && vpcId.match(/^vpc-[0-9a-z]+$/i)) {
    return {vpcId, subnetIds, sgIds};
  }

  // Get all the data
  const describeVpcsPromise             = ec2.describeVpcs({}).promise();
  const describeSecurityGroupsPromise   = ec2.describeSecurityGroups({}).promise();
  const describeSubnetsPromise          = ec2.describeSubnets({}).promise();

  const allVpcs                         = (await describeVpcsPromise).Vpcs;
  const allSgs                          = (await describeSecurityGroupsPromise).SecurityGroups;
  const allSubnets                      = (await describeSubnetsPromise).Subnets;

  // Find the VPC object
  vpc         = findVpcById() || findVpcByClassB() || findVpcByName();
  if (!vpc) { return {}; }

  subnets     = [...findSubnetsById(vpc), ...findSubnetsByName(vpc)];
  sgs         = findSgsByName(vpc);

  vpcId       = vpc.VpcId;
  subnetIds   = _.map(subnets, subnet => subnet.SubnetId);
  sgIds       = _.map(sgs,     sgroup => sgroup.GroupId);

  // ARGV.v(`getVpcSubnetsSgs:`, {vpc, subnets, sgs, vpcId, subnetIds, sgIds});
  return {vpc, subnets, sgs, vpcId, subnetIds, sgIds};

  // =============================================================
  // Helper functions
  // =============================================================

  // Note: in the findVpc... fns, we use `vpcId`, which is from the containing fn;
  //       in the other find... fns, we use `vpc.VpcId`, where `vpc` is passed in.

  // ----- Vpcs -----
  function findVpcById() {
    if (!vpcId) { return; }

    const foundVpcs = _.filter(allVpcs, vpc => vpc.VpcId === vpcId);
    return foundVpcs[0];
  }

  function findVpcByClassB() {
    var   classB  = argv.classb || argv.classB || argv.class_b || vpcId;
    if (!classB)  { return; }

    classB = getClassB(classB);

    // Make it a string
    classB = ''+classB;

    // Must be a number 1..255
    let m = classB.match(/^([1-9][0-9]*)$/);
    if (m && m[1].length <= 3) {
      classB = m[1];
    }

    const foundVpcs = _.filter(allVpcs, vpc => (vpc.CidrBlock||'').split('.')[1] === classB);
    return foundVpcs[0];
  }

  function findVpcByName() {
    const name = argv.name || vpcId;
    if (!name) { return; }

    const foundVpcs = _.filter(allVpcs, vpc => getAwsTag(vpc, 'Name').toLowerCase().startsWith(name));
    return foundVpcs[0];
  }

  // ----- Subnets -----
  function findSubnetsById(vpc) {
    const foundSubnets = _.filter(allSubnets, subnet => subnet.VpcId === vpc.VpcId && subnetIds.indexOf(subnet.SubnetId) !== -1);
    return foundSubnets;
  }

  function findSubnetsByName(vpc) {
    const names = ['worker', ...subnetIds];
    const foundSubnets = _.filter(allSubnets, subnet => {
      const found = subnet.VpcId === vpc.VpcId && sg.startsWithOneOf(getAwsTag(subnet, 'Name').toLowerCase(), names);
      return found;
    });
    return foundSubnets;
  }

  // ----- Security Groups -----
  function findSgsByName(vpc) {
    const foundSgs = _.filter(allSgs, sgroup => {
      return sgroup.VpcId === vpc.VpcId && sgIds.indexOf(sgroup.GroupName) !== -1;
    });
    return foundSgs;
  }
}

function getAwsTag(obj, key) {
  return sg.reduce(obj.Tags||[], null, (m, tag) => {
    if (tag.Key === key) {
      return tag.Value;
    }
    return m;
  }) || '';
}

function getClassB(ip) {
  if (_.isNumber(ip))             { return ip; }
  if (!_.isString(ip))            { return; }
  if (!ip.match(/^[.0-9]+$/))     { return; }

  const parts = ip.split('.');

  // Just a string representation of a number
  if (parts.length === 1)  {
    return +parts[0];
  }

  // It was an IP address.
  if (parts.length !== 4)       { return; }
  if (parts[1].length > 3)      { return; }
  if (parts[1].length === 0)    { return; }

  return +parts[1];
}






sgsPlus = [() => ({
  GroupName:    'lambda',     // <------------------------------------------------------- lambda
  Description:  'An sg to identify lambda fns',
  ingress: []
}), () => ({
  GroupName:    'admin',      // <------------------------------------------------------- admin
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
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     80,
    ToPort:       80,
    Description:  'HTTP for webtier to expose'
  }]
}), () => ({
  GroupName:    'access',      // <------------------------------------------------------- access
  Description:  'Rules for Nat Instances and Bastions',
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
    FromPort:     0,
    ToPort:       65535,
    Description:  'All TCP from the data center so we can NAT them'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  }]
}), () => ({
  GroupName:    'devOps',      // <------------------------------------------------------- devOps
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
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  }]
}), () => ({
  GroupName:    'db',      // <------------------------------------------------------- db
  Description:  'Open for MongoDB ports',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     27017,
    ToPort:       27017,
    Description:  'All db access'
  },{
    /*GroupId*/
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     28017,
    ToPort:       28017,
    Description:  'HTTP db access'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  },{
    ingressGroupId: getSecurityGroupId('access'),           /* TODO: Remove for prod */
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from bastion instances'
  },{
    ingressGroupId: getSecurityGroupId('devOps'),           /* TODO: Remove for prod */
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from devOps instances'
  }]
}), () => ({
  GroupName:    'util',      // <------------------------------------------------------- util
  Description:  'Open for things like Redis and/or memcachced',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     6379,
    ToPort:       6380,
    Description:  'All Redis access'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     11211,
    ToPort:       11211,
    Description:  'All memcached access'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  },{
    ingressGroupId: getSecurityGroupId('access'),           /* TODO: Remove for prod */
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from bastion instances'
  },{
    ingressGroupId: getSecurityGroupId('devOps'),           /* TODO: Remove for prod */
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from devOps instances'
  }]
}), () => ({
  GroupName:    'web',      // <------------------------------------------------------- web
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
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  },{
    ingressGroupId: getSecurityGroupId('access'),           /* TODO: Remove for prod */
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from bastion instances'
  },{
    ingressGroupId: getSecurityGroupId('devOps'),           /* TODO: Remove for prod */
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from devOps instances'
  }]
}), () => ({
  GroupName:    'worker',      // <------------------------------------------------------- worker
  Description:  'Open at many high ports',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     7000,
    ToPort:       9999,
    Description:  'All HTTP'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  },{
    ingressGroupId: getSecurityGroupId('access'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from bastion instances'
  },{
    ingressGroupId: getSecurityGroupId('devOps'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from devOps instances'
  }]
}), () => ({
  GroupName:    'container_hosts',      // <------------------------------------------------------- container_hosts
  Description:  'Open at many high ports',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     7000,
    ToPort:       9999,
    Description:  'All HTTP'
  },{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/0',
    FromPort:     2379,
    ToPort:       2380,
    Description:  'etcd'
  },{
    ingressGroupId: getSecurityGroupId('admin'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from admin instances'
  },{
    ingressGroupId: getSecurityGroupId('access'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from bastion instances'
  },{
    ingressGroupId: getSecurityGroupId('devOps'),
    IpProtocol:   'tcp',
    FromPort:     22,
    ToPort:       22,
    Description:  'SSH from devOps instances'
  }]
})];

var sgsForEndpointServices = [() => ({
  GroupName:    'ECS_endpoint',      // <-------------------------------------------------------
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
  GroupName:    'ECR_endpoint',      // <-------------------------------------------------------
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
  GroupName:    'KMS_endpoint',      // <-------------------------------------------------------
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
  GroupName:    'STS_endpoint',      // <-------------------------------------------------------
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
  GroupName:    'SQS_endpoint',      // <-------------------------------------------------------
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
  GroupName:    'SNS_endpoint',      // <-------------------------------------------------------
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
  GroupName:    'secretsmanager_endpoint',      // <-------------------------------------------------------
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
  GroupName:    'ec2_endpoint',      // <-------------------------------------------------------
  Description:  'Access to ec2,ec2-messages Endpoints',
  ingress: [{
    /*GroupId*/
    IpProtocol:   'tcp',
    CidrIp:       '10.0.0.0/8',
    FromPort:     443,
    ToPort:       443,
    Description:  'ec2 Endpoint Access'
  }]
})
];



function getSuperb() {
  var   adj = superb.random();
  while (!adj.match(/^[a-z]+$/)) {
    adj = superb.random();
  }
  return adj;
}

function zoneSuffix(AvailabilityZone) {
  return `zone${(_.last(AvailabilityZone) || 'z').toUpperCase()}`;
}
