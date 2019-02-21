#!/usr/bin/env node

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
require('loud-rejection/register');
const sg0                     = require('sg-clihelp');
const sg                      = sg0.merge(sg0, require('sg-template'), require('sg-exec'));
const { _ }                   = sg;

const ARGV                    = sg.ARGV();


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

const main = function() {
  const cmd   = ARGV._.shift();

  if (cmd === 'install') {
    let { install } = require('./install');
    return install(ARGV);

  } else if (cmd === 'build') {
    let build = require('./build');
    return build(ARGV);
  }
};

main();



// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


