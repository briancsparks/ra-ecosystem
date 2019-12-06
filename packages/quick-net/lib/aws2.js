/* eslint-disable valid-jsdoc */

const sg0                     = require('sg-diag');
const sg                      = sg0.merge(sg0);
const {_}                     = sg;
const quickMerge              = require('quick-merge');
const util                    = require('util');
const AWS                     = require('aws-sdk');
const sgRedis                 = require('@sg0/sg-cache-redis');
const {AwsDataBlob}           = require('./aws3');
const DIAG                    = sg0.DIAG(module);

// const sgRedis                 = {};   // TODO: wrong
const {getCache0}             = sgRedis;
const qm                      = quickMerge.quickMergeImmutable;

// const ARGV                    = sg.ARGV();
// const ENV                     = sg.ENV();
const dg                      = DIAG.dg;

module.exports.awsService     = awsService;

if (require.main === module) {
  main();
}


const main = function() {
  awsService({serviceName:"EC2", command: 'describeInstances'}, {}, function(err, data, ...rest) {
    dg.i(`describeInstances`, {err, data});
  });
};

function awsService(argv, context, callback) {
  const {serviceName, command, ...rest} = argv;

  // dg.i(`Getting awsService ${serviceName}`, {argv});
  // dg.d(`Getting awsService ${serviceName}`, {argv});
  // dg.v(`Getting awsService ${serviceName}`, {argv});

  var   ttl = 20 * 60;      /* 20 min */
  // var   ttl = 3;         /* 3 sec */

  const key = `quicknet:awsApiCache:${serviceName}:${command}`;
  return getCache0(key, {ttl}, util.callbackify(async function getFromAws() {

    // Expensive op to get from AWS
    const service   = new AWS[serviceName]({region:'us-east-1', paramValidation:false});
    const res       = service[command](rest).promise();

    var   data      = await res;
    // data            = sg.safeJSONStringify(data);

    // return data;

    const bob = new AwsDataBlob();
    bob.addResult(data);

    const value = bob.getData();
    return value;

  }), function(err, data) {
    return callback(err, data);
  });
}
