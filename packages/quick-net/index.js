
/**
 * @file
 */
const sg                      = require('sg-argv');
const { _ }                   = sg;

 var lib = {};

exports.libAws                = require('./lib/aws');
exports.libHttp               = require('./lib/http');

// expo(require('./commands/vpcs'));
// expo(require('./lib/ec2/vpc'));

var   mods = {};

mods.commandVpcs             = require('./commands/vpcs');
mods.commandInstances        = require('./commands/instances');
mods.libDynamoDb             = require('./lib/db/dynamodb');
mods.libDescribeVpc          = require('./lib/ec2/vpc/describe');
mods.libCidr                 = require('./lib/ec2/cidr');
mods.libEc2                  = require('./lib/ec2/ec2');
mods.libTags                 = require('./lib/ec2/tags');
mods.libVpc                  = require('./lib/ec2/vpc');
mods.libAws                  = require('./lib/aws');


// Export all my dependencies, so lambdas do not have to include them
lib.mods3rdParty = {};

lib.get3rdPartyLib = function(name) {
  lib.mods3rdParty[name] = lib.mods3rdParty[name] || require(name);
  return lib.mods3rdParty[name];
};

lib.getMod = function(name) {
  for (let k of Object.keys(mods)) {
    if (name in mods[k]) {
      return mods[k];
    }
  }
};



expo(lib);
function expo(mod) {
  _.each(mod, (value, name) => {
    exports[name] = value;
  });
}
