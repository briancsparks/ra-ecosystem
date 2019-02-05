
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const qnet                    = require('..');
const ra0                     = require('run-anywhere');
const ra                      = ra0.v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-argv'));
const { _ }                   = sg;

const {
  hardRejection
}                             = ra;

var   mods = [];

var   theMod;
const commandVpcs             = theMod = require('../commands/vpcs');                     mods.push(theMod);
const commandInstances        = theMod = require('../commands/instances');                mods.push(theMod);
const libDynamoDb             = theMod = require('../lib/db/dynamodb');                   mods.push(theMod);
const libDescribeVpc          = theMod = require('../lib/ec2/vpc/describe');              mods.push(theMod);
const libCidr                 = theMod = require('../lib/ec2/cidr');                      mods.push(theMod);
const libEc2                  = theMod = require('../lib/ec2/ec2');                       mods.push(theMod);
const libTags                 = theMod = require('../lib/ec2/tags');                      mods.push(theMod);
const libVpc                  = theMod = require('../lib/ec2/vpc');                       mods.push(theMod);
const libAws                  = theMod = require('../lib/aws');                           mods.push(theMod);

const ARGV                    = sg.ARGV();
// console.log({ARGV});


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

if (process.argv[1] === __filename) {
  quickNet();
}

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function quickNet() {
  require('loud-rejection/register');

  const fname = ARGV._[0];
  if (!fname) {
    console.error(`Must provide a function name`);
    process.exit(2);
    return;
  }

  // Try to find the function in the modules
  const mod = sg.reduce(mods, null, (m, theMod) => {

    let fn = theMod[fname];
    // console.log(`mod`, sg.inspect({theMod, fn}));
    if (_.isFunction(fn)) {
      if (m) {
        console.warn(`Duplicate ${fname} functions in ${theMod.modname || 'some_mod'} and ${m.modname || 'some_other_mod'}`);
      }
      m = theMod;
    }

    return m;
  });

  if (!mod) {
    console.error(`${fname} not found`);
    return;
  }

  // Otherwise, run it
  // const fn = fra.loads(libDescribe, 'describeVpcs', fra.opts({}), abort);
  const fn = mod[fname];






  return ra0.invoke2(ARGV, fn, function(err) {
    var exitCode = 0;

    if (err) {
      exitCode = 1;
      console.error(err, "Error invoking: "+msg);
    }

    if (arguments.length === 1) {
      process.exit(exitCode);
      return;
    }

    if (arguments.length === 2) {
      if (_.isString(arguments[1])) {
        process.stdout.write(arguments[1]+'\n');
      } else {
        process.stdout.write(JSON.stringify(arguments[1])+'\n');
      }
      return;
    }

    /* otherwise */
    process.stdout.write(JSON.stringify(_.drop(arguments))+'\n');
    process.exit(exitCode);
  });
}
