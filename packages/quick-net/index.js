if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-clihelp'));
const { _ }                   = sg;

var lib = {};

lib.sg                        = sg;

// ADDING1: Add the new mod to the end of this list and name it like libXyz.
//          Then it will be available as quickNet.libXyz
exports.libAws                = require('./lib/aws');
exports.libHttp               = require('./lib/http');
exports.libStorage            = require('./lib/storage');

// expo(require('./commands/vpcs'));
// expo(require('./lib/ec2/vpc'));

var   mods = {};

// ADDING2: Add the new mod to the end of this list and name it like libXyz.
//          Then it will be available as quickNet.mod.libXyz
mods.commandVpcs             = require('./commands/vpcs');
mods.commandInstances        = require('./commands/instances');
mods.setupWebtier            = require('./commands/setup-webtier');
mods.libDynamoDb             = require('./lib/db/dynamodb');
mods.libDescribeVpc          = require('./lib/ec2/vpc/describe');
mods.libCidr                 = require('./lib/ec2/cidr');
mods.libEc2                  = require('./lib/ec2/ec2');
mods.libTags                 = require('./lib/ec2/tags');
mods.libVpc                  = require('./lib/ec2/vpc');
mods.dataPtr                 = require('./lib/data-tap/data-ptr');
mods.fanout                  = require('./lib/data-tap/fanout');
mods.read                    = require('./lib/data-tap/read');
mods.status                  = require('./lib/data-tap/status');
mods.libAws                  = require('./lib/aws');
mods.libStorage              = require('./lib/storage');


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

lib.mods = mods;

// ADDING3: Add the new mod to the end of this list.
//          Then all items of the module quickNet.itemX
ra.exportSubModules(module, [
  require('./lib/data-tap'),
  require('./lib/data-transfer'),
  require('./lib/storage'),
]);

expo(lib);
function expo(mod) {
  _.each(mod, (value, name) => {
    exports[name] = value;
  });
}
