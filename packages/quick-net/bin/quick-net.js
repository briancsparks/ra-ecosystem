
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg-argv');
const { _ }                   = sg;
const qnet                    = require('..');

const commandVpcs             = require('../commands/vpcs');
const commandInstances        = require('../commands/instances');
const libDynamoDb             = require('../lib/db/dynamodb');
const libDescribeVpc          = require('../lib/ec2/vpc/describe');
const libCidr                 = require('../lib/ec2/cidr');
const libEc2                  = require('../lib/ec2/ec2');
const libTags                 = require('../lib/ec2/tags');
const libVpc                  = require('../lib/ec2/vpc');
const libAws                  = require('../lib/aws');

// console.log(2, {libEc2});


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

module.exports = quickNet;

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function quickNet() {
}
