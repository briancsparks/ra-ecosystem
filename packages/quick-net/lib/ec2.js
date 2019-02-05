
/**
 * @file
 */
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;

var lib = {};

exports.vpc = require('./ec2/vpc');






_.extend(module.exports, require('./ec2/vpc'));
