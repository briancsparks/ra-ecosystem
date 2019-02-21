#!/usr/bin/env node

/**
 * @file
 *
 * This is the file that gets executed when the user does `sg-isntall ...`
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
require('loud-rejection/register');
const sg0                     = require('sg-clihelp');
const sg                      = sg0.merge(sg0, require('sg-template'), require('sg-exec'));
const { _ }                   = sg;
const glob                    = require('glob');

const ARGV                    = sg.ARGV();


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//
const main = function() {
  const type      = ARGV._.shift();
  const templates = glob.sync(`templates/**/build-${type}*.js`, {cwd: __dirname}) || [];
  const template  = templates[0];

  if (template) {
    sg.generate({fliename: sg.path.join(__dirname, template), output:'-'});
    return;
  }

  const scripts   = glob.sync(`scripts/**/install-${type}*.js`, {cwd: __dirname}) || [];
  const script    = scripts[0];

  if (script) {
    return sg.execz(script, function(err, stdout) {
      return;
    });
  }

  // Nothing?
  console.error(`Cannot find ${type}`);
  process.exit(2);
  return;
};

main();
// (async function() {
//   await main();
// })();




// -------------------------------------------------------------------------------------
//  Helper Functions
//


