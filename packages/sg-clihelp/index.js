
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

var   ARGV;

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

/**
 * Called when you are going to give up processing.
 *
 * @param {string} [msg]        - An optional message to display.
 * @param {number} [code=113]   - The exit code.
 *
 * @returns {number} Passes back `code`.
 */
function die(msg, code = 113) {
  console.error(msg);
  process.exit(code);
  return code;
}

function from(...args) {
  if (args.length === 3) {
    let [dirname,filename,key] = args;
    return _from_(path.join(dirname, filename), key);
  }

  var   filename,key;
  if (args.length === 2 && Array.isArray(args[0])) {
    filename  = path.join(...args[0]);
    key       = args[1];
  }

  if (filename && key) {
    return _from_(filename, key);
  }

  return _from_(...args);
}

function include(dirname, filename) {
  return _include_(path.join(dirname, filename));
}

function _from_(filename, key) {
  const mod     = _include_(filename);
  const result  = sg.deref(mod, key);

  if (sg.isnt(result)) {
    (ARGV = ARGV || sg.ARGV()).d(`Getting ${key} from ${filename} failed, mod:`, {mod});
  }

  return result;
}

function _include_(filename) {
  try {
    return require(filename);
  } catch(error) {}
}


