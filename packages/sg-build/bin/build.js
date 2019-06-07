#!/usr/bin/env node

/**
 * @file
 *
 * This is the file that gets executed when the user does `sg-build ...`
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
// const unlouded                = require('loud-rejection')();
const sg0                     = require('sg-clihelp');
const sg                      = sg0.merge(sg0, require('sg-template'));
const { _ }                   = sg;
const glob                    = require('glob');

const ARGV                    = sg.ARGV();


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//
const build = function(argv) {
  const type      = argv._.shift();

  // Get the script
  const scripts   = glob.sync(`scripts/**/build-${type}`, {cwd: __dirname}) || [];
  const script    = sg.path.join(__dirname, scripts[0]);

  if (script) {
    return sg.execz({show:true}, script, function(err, stdout) {
      return;
    });
  }

  // Maybe there is a template?
  const templates = glob.sync(`templates/**/build-${type}*.js`, {cwd: __dirname}) || [];
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

exports.build   = build;

if (process.argv[1] === __filename || process.argv[1].endsWith('build')) {
  build(ARGV);
}


// -------------------------------------------------------------------------------------
//  Helper Functions
//


