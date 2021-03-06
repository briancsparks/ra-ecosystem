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

console.error({a:process.argv, ARGV, __filename});


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//
const install = function(argv) {
  const type      = argv._.shift();

  // Get the script
  const scripts   = glob.sync(`scripts/**/install-${type}`, {cwd: __dirname}) || [];
  const script    = sg.path.join(__dirname, scripts[0]);

  if (script) {
    return sg.execz({show:true}, script, function(err, stdout) {
      return;
    });
  }

  // Maybe there is a template?
  const templates = glob.sync(`templates/**/install-${type}*.js`, {cwd: __dirname}) || [];
  const template  = templates[0];

  if (template) {
    sg.generate({fliename: sg.path.join(__dirname, template), output:'-'});
    return;
  }

  // Nothing?
  console.error(`Cannot find ${type}`);
  process.exit(2);
  return;
};

exports.install   = install;

if (process.argv[1] === __filename || process.argv[1].endsWith('install')) {
  install(ARGV);
}

// -------------------------------------------------------------------------------------
//  Helper Functions
//


