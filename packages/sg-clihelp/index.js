
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg-argv');
const { _ }                   = sg;

// Additions
const fs   = sg.fs            = require('fs');
const path = sg.path          = require('path');
const os   = sg.os            = require('os');
const sh   = sg.sh            = require('shelljs');

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

sg.die      = die;
sg.include  = include;
sg.from     = from;

// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//
_.each(sg, (fn, name) => {
  exports[name] = fn;
});

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function die(msg, code=13) {
  console.error(msg);
  process.exit(code);
  return code;
}

function from(dirname, filename, key) {
  return sg.deref(include(dirname, filename), key);
}

function include(dirname, filename) {
  try {
    return require(path.join(dirname, filename));
  } catch(error) {}
}


