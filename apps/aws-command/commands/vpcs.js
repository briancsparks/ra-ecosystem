
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
const skipAbort               = {abort:false, ...debugCalls};

const tag                     = ra.load(libTag, 'tag');
const mod                     = ra.modSquad(module, 'awsCommand');

// const upsertVpc               = ra.load(libVpc, 'upsertVpc');
// const upsertSubnet            = ra.load(libVpc, 'upsertSubnet');
// const allocateAddress         = ra.load(libVpc, 'allocateAddress');
// const createInternetGateway   = ra.load(libVpc, 'createInternetGateway');
// const createNatGateway        = ra.load(libVpc, 'createNatGateway');
// const upsertSecurityGroup     = ra.load(libVpc, 'upsertSecurityGroup');
// const upsertSecurityGroupIngress     = ra.load(libVpc, 'upsertSecurityGroupIngress');


mod.xport({manageVpc: function(argv, context, callback) {

  // ra invoke commands\vpcs.js manageVpc --program=ratest

  const ractx     = context.runAnywhere || {};
  const { fra }   = (ractx.awsCommand__manageVpc || ractx);

  return fra.iwrap('awsCommand::manageVpc', function(abort, calling) {
    const { upsertVpc,upsertSubnet } = ra.loads(libVpc, 'upsertVpc,upsertSubnet', context, {...debugCalls}, abort);
    const { upsertSecurityGroup,upsertSecurityGroupIngress } = ra.loads(libVpc, 'upsertSecurityGroup,upsertSecurityGroupIngress', context, {...debugCalls}, abort);
    const { allocateAddress } = ra.loads(libVpc, 'allocateAddress', context, {...debugCalls}, abort);
    const { createInternetGateway,createNatGateway } = ra.loads(libVpc, 'createInternetGateway,createNatGateway', context, {...debugCalls}, abort);

    const program           = fra.arg(argv, 'program', {required:true});
    const classB            = fra.arg(argv, 'classB,class-b');
    const CidrBlock         = fra.arg(argv, 'CidrBlock,cidr')    || (classB ? `10.${classB}.0.0/16` : argv.cidr);

    const reqd = { CidrBlock };
    if (fra.argErrors(reqd))    { return fra.abort(); }

    var   VpcId           = null;
    var   vpcCidr         = null;
    var   publicSubnets   = [];

    console.log(`manageVpc.run`, sg.inspect({CidrBlock, program, classB}));
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

      my.result.subnets = {};
      sg.__each([{name:'Public', bits:24, publicIp:true},{name:'worker', bits:20}], function(kind, next) {
        const { publicIp } = kind;

        cidrBits = kind.bits;
        sg.__each('a,b,c'.split(','), function(letter, next) {
          var   subnet            = {VpcId};
          var   AvailabilityZone  = `us-east-1${letter}`;

          var   CidrBlock         = toCidr(currCidrFirst, bitsToNetmask(cidrBits));
          if (currCidrFirst !== firstIpInCidr(CidrBlock)) {
            currCidrFirst = lastIpInCidr(CidrBlock) + 1;
            CidrBlock     = toCidr(currCidrFirst, bitsToNetmask(cidrBits));
          }

          subnet = sg.extend(subnet, {CidrBlock, AvailabilityZone});
          subnet = sg.kv(subnet, 'publicIp', publicIp);
          paramsList.push(subnet);

          currCidrFirst = lastIpInCidr(CidrBlock) + 1;
          return next();

        }, function() {
          return next();
        });
      }, function() {

        sg.__eachll(paramsList, function(params, next) {

          // ----- Create the subnets
          return upsertSubnet(params, {}, function(err, data) {
            my.result.subnets[params.AvailabilityZone] = data.result;
            my.resources.push(data.result.Subnet.SubnetId);

            if (params.publicIp) {
              publicSubnets.push(data.result.Subnet);
            }

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
      return createInternetGateway({VpcId}, {}, function(err, data) {
        const { InternetGatewayId } = data.result.InternetGateway;
        my.result.internetGateway = data.result;
        my.resources.push(InternetGatewayId);

        return sg.__eachll(publicSubnets, function(subnet, next) {
          const { SubnetId, AvailabilityZone } = subnet;

          return allocateAddress({VpcId, SubnetId}, {}, function(err, data) {
            const { AllocationId } = data.result.Address;
            my.result.address = data.result;
            my.resources.push(AllocationId);

            return createNatGateway({VpcId, SubnetId}, {}, function(err, data) {
              const { NatGatewayId } = data.result.NatGateway;
              my.result.natGateways[AvailabilityZone] = data.result;
              my.resources.push(NatGatewayId);

              return next();
            });
          });
        }, function() {
          return next();
        });
      });

    }, function(my, next) {
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
