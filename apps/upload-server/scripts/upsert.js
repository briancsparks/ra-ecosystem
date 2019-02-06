
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'));
const { _ }                   = sg;
const quickMerge              = require('quick-merge');
// var   sg                      = require('sg-config');

const qm                      = quickMerge.quickMergeResolve;
const argvGet                 = sg.argvGet;

const ARGV  = sg.ARGV();

const getSubnets = 'getSubnets';

// console.log({ra});

(function() {
  const mod = quickNet.getMod(getSubnets);

  const debug             = ARGV.debug;
  const verbose           = ARGV.verbose;
  const SubnetId          = 'webtier';
  const SecurityGroupIds  = 'admin';
  const classB            = 111;
  const az                = ARGV.az;

  return ra.invoke2({SecurityGroupIds,SubnetId,classB,debug,verbose}, mod, getSubnets, function(err, data, ...rest) {

    const jsonData = {
      "FunctionName": argvGet(ARGV, 'FunctionName,name', {required:true}),
      "Runtime": "nodejs8.10",
      "Role": "supercow",
      "Handler": "lamba.handler",
      "Timeout": 10,
      "MemorySize": 64,
      "Description": sg.deref(require('../package.json'), 'description'),
      "Code": {
          "ZipFile": null,
          "S3Bucket": "",
          "S3Key": "",
          "S3ObjectVersion": ""
      },
      "Publish": argvGet(ARGV, "Publish") || false,
      "VpcConfig": {
          "SubnetIds": sg.pluck(data.subnets.filter(s => s.AvailabilityZone.endsWith(az)), 'SubnetId'),
          "SecurityGroupIds": sg.pluck(data.securityGroups, 'GroupId'),
      },
      "DeadLetterConfig": {
          "TargetArn": ""
      },
      "Environment": {
          "Variables": {
              "KeyName": ""
          }
      },
      "KMSKeyArn": "",
      "TracingConfig": {
          "Mode": "Active"
      },
      "Tags": {
          "KeyName": ""
      },
      "Layers": [
          ""
      ]
    };

    sg.debugLog(`json`, {jsonData});

    return jsonData;
  });
})();


