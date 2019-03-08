
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
const util = sg.util          = require('util');
const sh   = sg.sh            = require('shelljs');

var   ARGV;

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

sg.die          = die;
sg.grepLines    = grepLines;
sg.include      = include;
sg.from         = from;
sg.startupDone  = startupDone;

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

/**
 * Prints the captured parts of the lines to stdout.
 *
 * @param {RegExp} regex    - The re to match against.
 * @param {String} filename - The filename to search through.
 */
function grepLines(regex, filename) {
  const lines = sg.splitLn(sh.grep(regex, filename));

  lines.forEach(line => {
    let m = line.match(regex);
    if (m) {
      if (m[1]) {
        process.stdout.write(m[1]+'\n');
      } else {
        process.stdout.write('\n');
      }
    }
  });
}

function startupDone(ARGV, modfilename, failed, msg) {
  if (ARGV.help) {
    if (modfilename)    { grepLines(/^#==(.*)/, modfilename); }

    process.exit(0);
    return true;
  }

  if (failed) {
    if (msg)                    { console.error(msg); }

    process.exit(113);
    return true;
  }

  return false;
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


