
/**
 * @file
 */

// -------------------------------------------------------------------------------------
//  Requirements
//

const sg                      = require('sg0');
const { _ }                   = sg;

// -------------------------------------------------------------------------------------
//  Data
//

// -------------------------------------------------------------------------------------
//  Functions
//

sg.ARGV       = ARGV;
sg.argvGet    = argvGet;

// -------------------------------------------------------------------------------------
// exports
//

sg._.each(sg, (v, k) => {
  exports[k] = v;
});

// -------------------------------------------------------------------------------------
//  Helper Functions
//

/**
 * Returns the ARGV object from the passed-in array (typically process.argv.)
 *
 * `minimist` does the heavy-lifting, but we pre-process the args first, to provide
 * some added functionality.
 *
 * @param {*} [input=process.argv]
 * @returns
 */
function ARGV(input = process.argv) {
  var args = [], argv = {};

  // Pre-process the args
  args    = preProcess(input.slice(2), argv);

  // Let `minimist` add what it does best
  argv    = sg.smartExtend(argv, require('minimist')(args));

  // Verbose implies debug
  if (argv.verbose) {
    argv.debug = true;
  }

  if (argv.debug) {
    sg.mkInspect({fancy:true});
  }

  // Add snake-cased keys
  const keys = sg.keys(argv);
  for (var i = 0; i < keys.length; ++i) {
    let   key     = keys[i];
    let   snaked  = snake_case(key);

    if (key !== snaked) {
      argv[snaked] = argv[key];
    }
  }

  // Augment
  argv._get = function(...args) {
    return argvGet(argv, ...args);
  };

  argv.d = function(msg, one='', two='', ...args) {
    if (!argv.debug) { return; }
    return sg.log(msg, one, two, ...args);
  };

  argv.d_if = function(test, msg, one='', two='', ...args) {
    if (!argv.debug || !test) { return; }
    return sg.log(msg, one, two, ...args);
  };

  argv.v = function(msg, one='', two='', ...args) {
    if (!argv.verbose) { return; }
    return sg.log(msg, one, two, ...args);
  };

  argv.v_if = function(test, msg, one='', two='', ...args) {
    if (!argv.verbose || !test) { return; }
    return sg.log(msg, one, two, ...args);
  };

  return argv;
}

/**
 * Loop through the args and pick out the ones that have a meaning that `minimist`
 * does not understand, and process those.
 *
 * ```
 *      --a-list= one two three
 * ```
 *
 * @param {*} args
 * @param {*} argv
 * @returns
 */
function preProcess(args, argv) {
  var   result = [];

  var old;
  for (var i = 0; i < args.length;) {

    // Remember the old index
    old = i;

    // See if the array-param understanding function wants to handle this one
    i   = arrayParam(i, result, args, argv);

    // If the current was handled, it will increment `i`
    if (i === old) {
      result.push(args[i]);
      i += 1;
    }
  }

  return result;
}

function arrayParam(i, _, args, argv) {

  var   m;

  // Do we have `--a-list=`?
  if ((m = args[i].match(/--([^=]+)=$/))) {

    // Yes.  Get the snake-case key
    let key = snake_case(m[1]);

    // Create the array
    argv[key] = [];

    // Read args into the array
    for (++i; i < args.length; ++i) {
      if (args[i].startsWith('--'))   { break; }

      argv[key].push(sg.smartValue(args[i]));
    }
  }

  return i;
}

function snake_case(key) {
  return key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

/**
 * Get an option from the args.
 *
 * @param {*} argv
 * @param {*} names
 * @param {*} options
 */
function argvGet(argv, names, options) {
  return sg.reduce(names.split(','), null, (m, name) => {
    if (m)  { return m; }

    if (name in argv) {
      // return sg.kv(m, name, argv[name]);
      return argv[name];
    }
  });
}

