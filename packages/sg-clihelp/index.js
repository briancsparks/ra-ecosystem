if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg0                     = require('sg-argv');
const { _ }                   = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'));

// Additions
const fs   = sg.fs            = require('fs');
const path = sg.path          = require('path');
const os   = sg.os            = require('os');
const util = sg.util          = require('util');
const sh   = sg.sh            = require('shelljs');

var   ARGV  = sg.ARGV();

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
sg.runTopAsync  = runTopAsync;

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

// ------------------------------------------------------------------------------------------------------------------
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

  setTimeout(function() {
    process.exit(code);
  }, 0);

  return code;
}

// ------------------------------------------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------------------------------------------
/**
 * Reads a key out of a .json file.
 *
 * @param    {string}  dirname   - The directory of the JSON file.
 * @param    {string}  filename  - The filename of the JSON file.
 * @param    {string}  key       - The dotted key to retrieve.
 *
 * @returns  {Object}            - The value read from the JSON file.
 *
 *//**
 * Reads a key out of a .json file.
 *
 * @param    {string[]}   filename  - An Array of Strings to be joined to build the filename.
 * @param    {string}     key       - The dotted key to retrieve.
 *
 * @returns  {Object}               - The value read from the JSON file.
 *
 *//**
 * Reads a key out of a .json file.
 *
 * @param    {string}     filename  - The full filename.
 * @param    {string}     key       - The dotted key to retrieve.
 *
 * @returns  {Object}               - The value read from the JSON file.
 *
 *//**
 * Reads a key out of a .json file.
 *
 * @param    {...Object}  args   - Args.
 * @returns  {Object}            - The value read from the JSON file.
 */
 function from(...args) {
  if (args.length === 3) {
    let [dirname,filename,key] = args;
    return _from_(path.join(dirname, filename), key);
  }

  var   filename,key;
  if (args.length === 2 && Array.isArray(args[0])) {
    if (sg.anyIsnt(args[0])) {
      return;
    }

    filename  = path.join(...args[0]);
    key       = args[1];
  }

  if (filename && key) {
    return _from_(filename, key);
  }

  return _from_(...args);
}

// ------------------------------------------------------------------------------------------------------------------
function _from_(filename, key) {
  const mod     = _include_(filename);
  const result  = sg.deref(mod, key);

  if (sg.isnt(result)) {
    (ARGV = ARGV || sg.ARGV()).d(`Getting ${key} from ${filename} failed, mod:`, {mod});
  }

  return result;
}

// ------------------------------------------------------------------------------------------------------------------
function include(dirname, filename) {
  return _include_(path.join(dirname, filename));
}

// ------------------------------------------------------------------------------------------------------------------
function _include_(filename) {
  try {
    return require(filename);
  } catch(error) {
    // console.error(`_include_`, filename, error);
  }
}

// ------------------------------------------------------------------------------------------------------------------
/**
 * Runs an async function from the top-level.
 *
 * @param {function}  main            - The function to run.
 * @param {string}    [name='main']   - The name of the function for display and debugging.
 */
function runTopAsync(main, name='main') {
  (async () => {
    var [err, result] = await main();
    if (err) {
      return announceError(err);
    }

    const message = sg.extract(result, 'finalMessage');
    ARGV.i(`function ${name} finished:`, {result}, message);
  })().catch(err => {
    // Deal with the fact the chain failed
    console.error(`++++++++++++++++++++++ an error in ${name}`, err);
  });

  function announceError(err) {
    ARGV.w(`Error in ${name}`, err);
    if ('code' in err) {
      process.exit(err.code);
    }
    return err;
  }
}


