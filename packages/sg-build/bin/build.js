#!/usr/bin/env node

/**
 * @file
 *
 * This is the file that gets executed when the user does `sg-build ...`
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const unlouded                = require('loud-rejection')();
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
const main = function() {
  const type      = ARGV._.shift();
  const templates = glob.sync(`templates/**/build-${type}*.js`, {cwd: __dirname}) || [];
  const template  = templates[0];

  if (!template) {
    console.error(`Cannot find ${type}`);
    process.exit(2);
    return;
  }

  // console.log(templates, ARGV, template);

  sg.generate({fliename: sg.path.join(__dirname, template), output:'-'});
};

main();

// -------------------------------------------------------------------------------------
//  Helper Functions
//


