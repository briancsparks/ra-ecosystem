
/**
 * @file
 */
const _                       = require('lodash');

var lib = {};

exports.vpc = require('./ec2/vpc');






_.extend(module.exports, require('./ec2/vpc'));
