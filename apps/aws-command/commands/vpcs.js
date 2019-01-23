
/**
 * @file
 */

const _                       = require('lodash');
const sg                      = require('sg-flow');
const ra                      = require('run-anywhere').v2;
const libTag                  = require('../lib/ec2/tags');
const libVpc                  = require('../lib/ec2/vpc');
const libCidr                 = require('../lib/ec2/cidr');

const firstIpInCidr           = libCidr.firstIpInCidr;
const lastIpInCidr            = libCidr.lastIpInCidr;
const toCidr                  = libCidr.toCidr;
const bitsToNetmask           = libCidr.bitsToNetmask;

const debugCalls              = {debug:true};
// const debugCalls              = {debug:false};
const skipAbort               = {abort:false, ...debugCalls};

const tag                     = ra.load(libTag, 'tag');
const mod                     = ra.modSquad(module, 'awsCommand');


mod.xport({manageVpc: function(argv, context, callback) {

  // ra invoke commands\vpcs.js manageVpc --program=ratest

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommand__manageVpc || ractx);

  return fra.iwrap(function(abort, calling) {
    const { upsertVpc,upsertSubnet } = fra.loads(libVpc, 'upsertVpc,upsertSubnet', {...debugCalls}, abort);
    const { upsertSecurityGroup,upsertSecurityGroupIngress } = fra.loads(libVpc, 'upsertSecurityGroup,upsertSecurityGroupIngress', {...debugCalls}, abort);
    const { allocateAddress } = fra.loads(libVpc, 'allocateAddress', {...debugCalls}, abort);
    const { createInternetGateway,createNatGateway } = fra.loads(libVpc, 'createInternetGateway,createNatGateway', {...debugCalls}, abort);
    const { createRouteTable,createRoute,associateRouteTable } = fra.loads(libVpc, 'createRouteTable,createRoute,associateRouteTable', {...debugCalls}, abort);
    const { createVpcEndpoint } = fra.loads(libVpc, 'createVpcEndpoint', {...debugCalls}, abort);

    const program           = fra.arg(argv, 'program', {required:true});
    const classB            = fra.arg(argv, 'classB,class-b');
    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr')    || (classB ? `10.${classB}.0.0/16` : argv.cidr);

    const reqd = { CidrBlock };
    if (fra.argErrors(reqd))    { return fra.abort(); }

    var   VpcId               = null;
    var   vpcCidr             = null;
    var   publicRouteTable    = null;
    var   RouteTableIds       = [];
    var   internetGateway     = null;
    var   GatewayId           = null;
    var   publicSubnets       = [];
    var   privateSubnets      = [];

    var   azItems             = {};

    // console.error(`manageVpc.run`, sg.inspect({CidrBlock, program, classB}));
    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      my.resources = [];

      // ---------------------------------------- Vpc ----------
      return upsertVpc({CidrBlock}, {}, function(err, data) {
        my.result.vpc = data.result;

        VpcId = data.result.Vpc.VpcId;
        my.resources.push(VpcId);

        vpcCidr = CidrBlock;

        return next();
      });

    }, function(my, next) {
      const firstVpcIp            = firstIpInCidr(vpcCidr);
      var   currCidrFirst         = firstVpcIp;

      // ---------------------------------------- Subnets ----------

      // Calculate the subnet params
      var   paramsList = [];
      var   cidrBits;

      var   subnetKinds = [
        {name: 'webtier', bits:24, visibility:'public', publicIp:true},
        {name: 'worker', bits:20, visibility:'private'},
      ];

      var   azLetters = 'a,b,c'.split(',');
      // var   azLetters = 'a'.split(',');

      my.result.subnets = {};
      sg.__each(subnetKinds, function(kind, next) {
        const { publicIp } = kind;

        cidrBits = kind.bits;
        sg.__each(azLetters, function(letter, next) {
          var   subnet            = {VpcId};
          var   AvailabilityZone  = `us-east-1${letter}`;

          var   CidrBlock         = toCidr(currCidrFirst, bitsToNetmask(cidrBits));
          if (currCidrFirst !== firstIpInCidr(CidrBlock)) {
            currCidrFirst = lastIpInCidr(CidrBlock) + 1;
            CidrBlock     = toCidr(currCidrFirst, bitsToNetmask(cidrBits));
          }

          subnet = sg.extend(subnet, {CidrBlock, AvailabilityZone, kind});
          subnet = sg.kv(subnet, 'publicIp', publicIp);
          paramsList.push(subnet);

          currCidrFirst = lastIpInCidr(CidrBlock) + 1;
          return next();

        }, function() {
          return next();
        });
      }, function() {

        sg.__eachll(paramsList, function(params, next) {
          const {
            AvailabilityZone,
            kind
          }                       = params;
          const {
            name,
            visibility
          }                       = kind;

          // ----- Create the subnets
          return upsertSubnet(params, {}, function(err, data) {
            my.result.subnets[params.AvailabilityZone] = data.result;
            my.resources.push(data.result.Subnet.SubnetId);

            if (params.publicIp) {
              publicSubnets.push(data.result.Subnet);
            } else {
              privateSubnets.push(data.result.Subnet);
            }

            sg.setOna(azItems, [AvailabilityZone, 'subnets', name], data.result.Subnet);

            return next();
          });
        }, function() {
          return next();
        });
      });

    }, function(my, next) {
      // ---------------------------------------- Security Groups ----------
      return sg.__run(next, [function(next) {

        const sgs = [{
          GroupName:    'wide',
          Description:  'Available to all within data center',
          ingress: [{
            /*GroupId*/
            IpProtocol:   'tcp',
            CidrIp:       '10.0.0.0/8',
            FromPort:     0,
            ToPort:       65535,
            Description:  'All TCP from the data center'
          }]
        }];

        my.result.securityGroups = {};
        return sg.__eachll(sgs, function(secGroup, next) {
          const { GroupName, Description, ingress } = secGroup;

          return upsertSecurityGroup({VpcId, GroupName, Description}, {}, function(err, data) {
            const { GroupId } = data.result.SecurityGroup;
            my.result.securityGroups[GroupName] = data.result;
            my.resources.push(GroupId);

            return sg.__each(ingress, function(rule, next) {
              return upsertSecurityGroupIngress({GroupId, ...rule}, {}, function(err, data) {
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
      // ---------------------------------------- Gateway / NAT ----------
      my.result.natGateways = {};
      my.result.addresses = {};
      return createInternetGateway({VpcId}, {}, function(err, data) {
        const { InternetGatewayId } = data.result.InternetGateway;
        my.result.internetGateway = data.result;
        my.resources.push(InternetGatewayId);

        GatewayId       = InternetGatewayId;
        internetGateway = data.result.InternetGateway;

        return sg.__eachll(publicSubnets, function(subnet, next) {
          const { SubnetId, AvailabilityZone } = subnet;

          return allocateAddress({VpcId, SubnetId}, {}, function(err, data) {
            const { AllocationId } = data.result.Address;
            my.result.addresses[AvailabilityZone] = data.result;
            my.resources.push(AllocationId);

            return createNatGateway({VpcId, SubnetId}, {}, function(err, data) {
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
      // ---------------------------------------- Public Route Table ----------
      return createRouteTable({VpcId, public:true}, {}, function(err, data) {
        // console.error(`crt`, sg.inspect({err, data, publicSubnets, privateSubnets}));

        const { RouteTableId } = data.result.RouteTable;
        my.resources.push(RouteTableId);
        RouteTableIds.push(RouteTableId);
        publicRouteTable = data.result.RouteTable;

        return createRoute({RouteTableId, GatewayId, DestinationCidrBlock:'0.0.0.0/0'}, {}, function(err, data) {
          return sg.__eachll(publicSubnets, function(subnet, next) {
            const { SubnetId, AvailabilityZone } = subnet;

            return associateRouteTable({SubnetId,RouteTableId}, {}, function(err, data) {
              return next();
            });
          }, function() {
            return next();
          });
        });
      });

    }, function(my, next) {
      // ---------------------------------------- Private Route Tables ----------

      return sg.__eachll(privateSubnets, function(subnet, next) {
        const { SubnetId, AvailabilityZone } = subnet;

        return createRouteTable({VpcId, SubnetId}, {}, function(err, data) {

          const { RouteTableId } = data.result.RouteTable;
          my.resources.push(RouteTableId);
          RouteTableIds.push(RouteTableId);

          const { NatGatewayId } = sg.deref(azItems, [AvailabilityZone,  'NatGateway']);
          return createRoute({RouteTableId, NatGatewayId, DestinationCidrBlock:'0.0.0.0/0'}, {}, function(err, data) {
            return associateRouteTable({SubnetId,RouteTableId}, {}, function(err, data) {
              return next();
            });
            });
        });

      }, function() {
        return next();
      });

    }, function(my, next) {
      // ---------------------------------------- Vpc Endpoints ----------
      var   ServiceName = 'com.amazonaws.us-east-1.s3';
      return createVpcEndpoint({VpcId,ServiceName,RouteTableIds}, {}, function(err, data) {

        var   ServiceName = 'com.amazonaws.us-east-1.dynamodb';
        return createVpcEndpoint({VpcId,ServiceName,RouteTableIds}, {}, function(err, data) {

          return next();
        });
      });
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
