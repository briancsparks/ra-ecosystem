/* eslint-disable valid-jsdoc */

const sg0                     = require('sg-diag');
const sg                      = sg0.merge(sg0);
const {_}                     = sg;
const quickMerge              = require('quick-merge');
const util                    = require('util');
const AWS                     = require('aws-sdk');
// const sgRedis                 = require('sg-cache-redis');
const {AwsDataBlob}           = require('./aws3');
const DIAG                    = sg0.DIAG(module);

const sgRedis                 = {};   // TODO: wrong
const {getCache}              = sgRedis;
const qm                      = quickMerge.quickMergeImmutable;

// const ARGV                    = sg.ARGV();
// const ENV                     = sg.ENV();
// const dg                      = DIAG.dg;

module.exports.awsService     = awsService;


function awsService(argv, context, callback) {
  const {serviceName, command} = argv;

  // var   ttl = 10 * 60;     /* 10 min */
  var   ttl = 3;              /* 3 sec */

  const key = `jsaws:${serviceName}:${command}`;
  return getCache(key, util.callbackify(async function getFromAws() {

    // Expensive op to get from AWS
    const service   = new AWS[serviceName]({region:'us-east-1'});
    const res       = service[command]({}).promise();

    var   data      = await res;
    // data            = sg.safeJSONStringify(data);

    // return data;

    const bob = new AwsDataBlob();
    bob.parse(data);

    const value = bob.getData();
    return value;

  }), function(err, data) {
    // console.log(`debug`, serviceName, command, data);

    const bob = new AwsDataBlob();
    bob.parse(data);

    const value = bob.getData();

    // console.log(`bob`, value);
    return callback(null, value);
  });
}
