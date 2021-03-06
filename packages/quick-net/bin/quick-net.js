#!/usr/bin/env node

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
const sg                      = sg0.merge(sg0, require('sg-clihelp'));
const { _ }                   = sg;
const raModules               = require('../lib/ra-modules');

const raModFilenames          = raModules.filenames;
const raModFnMap              = raModules.modFnMap;

const { hardRejection }       = ra;
const { argvGet }             = sg;

var   mods = [];

var   theMod;
const commandVpcs             = theMod = require('../commands/vpcs');                     mods.push(theMod);
const commandInstances        = theMod = require('../commands/instances');                mods.push(theMod);
const setupWebtier            = theMod = require('../commands/setup-webtier');            mods.push(theMod);
const dataPtr                 = theMod = require('../lib/data-tap/data-ptr');             mods.push(theMod);
const fanout                  = theMod = require('../lib/data-tap/fanout');               mods.push(theMod);
const read                    = theMod = require('../lib/data-tap/read');                 mods.push(theMod);
const status                  = theMod = require('../lib/data-tap/status');               mods.push(theMod);
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

var   commands = {
  ls: function() {
    for (let mod of mods) {
      const keys = Object.keys(mod.async || {});
      if (keys && keys.length > 0) {
        sg.debugLog(keys.join('\n'));
      }
    }
  }
};


// -------------------------------------------------------------------------------------
//  Helper Functions
//

quickNet();

function quickNet() {
  return ra.command2(ARGV, /*loadedMods=*/ {}, raModFnMap || {}, raModFilenames, null, /*opts=*/ {}, commands, (err, data) => {
    // if (err) {
    //   return quickNetX();
    // }

    console.log(JSON.stringify([err, data]));
  });
}

function quickNetX() {
  require('loud-rejection/register');
  require('exit-on-epipe');

  const silent    = argvGet(ARGV, 'silent,s');
  const debug     = argvGet(ARGV, 'debug,d');
  const machine   = argvGet(ARGV, 'machine,m');
  const human     = ARGV._get('human,r');

  const command = commands[ARGV._[0]];
  if (_.isFunction(command)) {
    return command();
  }

  const fname = ARGV._[0];
  if (!fname) {
    console.error(`Must provide a function name`);
    process.exit(2);
    return;
  }

  // Try to find the function in the modules
  const mod = sg.reduce(mods, null, (m, theMod) => {

    let fn = theMod[fname];
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
  return ra0.invoke2(ARGV.pod(), mod, fname, function(err, ...rest) {
    var exitCode = 0;

    // Is there an error?
    if (err) {

      exitCode = 1;

      // Log it unless silent
      if (!silent) {
        console.error(err);
      }
    }

    // If we only got an error object, were done
    if (arguments.length === 1) {
      process.exit(exitCode);
      return;
    }

    // For humans
    if (human) {
      sg.debugLog(fname, ...rest);
      return;
    }

    // Machine output?
    if (machine) {
      _.each(rest, (result) => {
        if (!_.isString(result)) {
          process.stdout.write(JSON.stringify(result) + '\n');
          return;
        }

        process.stdout.write(result + '\n');
      });

      return;
    }

    /* otherwise -- machine-ish */
    _.each(rest, (result) => {
      if (!_.isString(result)) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
      }

      process.stdout.write(result + '\n');
    });
  });
}


