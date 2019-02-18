#!/usr/bin/env node

/**
 * @file
 *
 * Expand a template from the shell.
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg0                     = require('sg-clihelp');
const sg                      = sg0.merge(sg0, require('sg-template'));
const { _ }                   = sg;

const { argvGet }             = sg;

const ARGV                    = sg.ARGV();


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//
const main = function() {
  const filename    = ARGV._.shift() || argvGet(ARGV, 'filename,file,f');
  const output      = ARGV._.shift() || argvGet(ARGV, 'output,O');

  if (!filename) {
    console.error(`Usage: ${process.argv0} _filename_`);
    process.exit(2);
    return;
  }

  // console.log(templates, ARGV, template);

  const expanded = sg.generate(sg.merge({...ARGV, filename, output}));
};

main();

// -------------------------------------------------------------------------------------
//  Helper Functions
//


