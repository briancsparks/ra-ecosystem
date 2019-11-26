
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

if (require.main === module) {
  const output = main();
}

function main() {
  const mod = quickNet.getMod(getSubnets);

  const debug             = ARGV.debug;
  const verbose           = ARGV.verbose;
  const SubnetId          = 'webtier';
  const SecurityGroupIds  = 'admin';
  const classB            = 111;
  const az                = argvGet(ARGV, 'AvailabilityZone,az');
  const ZipFile           = argvGet(ARGV, 'ZipFile,zip');
  // const ZipFile           = ARGV.ZipFile || ARGV.zip;
  const S3Bucket          = argvGet(ARGV, 'S3Bucket,bucket');
  const S3Key             = argvGet(ARGV, 'S3Key,key');
  var   S3ObjectVersion;

  return ra.invoke2({SecurityGroupIds,SubnetId,classB,debug,verbose}, mod, getSubnets, function(err, data, ...rest) {
    // console.log({data, rest});

    const required = {
      "FunctionName": argvGet(ARGV, 'FunctionName,name', {required:true}),
      "Runtime": "nodejs8.10",
      "Role": `arn::iam::${process.env.AWS_ACCOUNT}:role/supercow`,
      "Handler": "lambda.handler"
    };

    const optional = {
      "Timeout": 40,
      "MemorySize": 128,
      "Description": sg.deref(require('../package.json'), 'description'),

      Code: sg.merge({ ZipFile, S3Bucket, S3Key, S3ObjectVersion }),

      "Publish": argvGet(ARGV, "Publish") || false,
      "VpcConfig": {
        "SubnetIds": sg.pluck(data.subnets, 'SubnetId'),
        "SecurityGroupIds": sg.pluck(data.securityGroups, 'GroupId'),
      },
      "Environment": {
          "Variables": {
              "KeyName": ""
          }
      },
      "TracingConfig": {
          "Mode": "Active"
      },
      "Tags": {
          "KeyName": ""
      }
    };

    const rare = {
      "DeadLetterConfig": {
          "TargetArn": ""
      },
      "KMSKeyArn": "",
      "Layers": [
          ""
      ]
    };

    // const jsonData = { ...required, ...optional, ...rare };
    const jsonData = qm({ ...required, ...optional, ...rare });

    // sg.debugLog(`json`, {jsonData});

    console.log(JSON.stringify(jsonData));
    return jsonData;
  });
}

