
/**
 * @file
 */

// -------------------------------------------------------------------------------------
//  Requirements
//

const sg                      = require('sg-diag');
const { _ }                   = sg;
const fs                      = require('fs');
const path                    = require('path');

sg.libs = {...(sg.libs || {}), fs, path};

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
 * @param {string[]} [input=process.argv] - The parameters to be parsed.
 *
 * @returns {Object} The ARGV Object, which has the parameters.
 */
function ARGV(input = process.argv) {
  var args = [], argv = {};

  // Pre-process the args
  args    = preProcess(input.slice(2), argv);

  // Let `minimist` add what it does best
  argv    = sg.smartExtend(argv, require('minimist')(args));

  // Active development means debug (unless quiet)
  if (process.env.ACTIVE_DEVELOPMENT && !argv.quiet) {
    argv.debug = true;
  }

  // Verbose implies debug
  if (argv.verbose) {
    argv.debug = true;
  }

  if (argv.vverbose) {
    argv.ddebug = true;
  }

  if (argv.debug || argv.ddebug) {
    sg.mkInspect({fancy:true});
  }

  const origKeys = sg.keys(argv);

  argv._origKeys = function() {
    return origKeys;
  };

  // See if any values are special values (like reading from file)
  origKeys.forEach(key => {
    if (key === '_')      { return; }

    var   value = argv[key];
    var   orig  = value;

    // A value that is an Array of one string is just the string
    if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
      value = value[0];
    }

    // `@filename` means read from the file
    if (_.isString(value)) {
      const m = value.match(/^@(.+)$/);
      if (m) {
        let filename  =  figureOutFile(m[1]);
        if (filename) {
          value = fs.readFileSync(filename, 'utf8');
        }
      }
    }

    if (value !== orig) {
      argv[key] = value;
    }
  });

  // Add snake-cased keys
  for (var i = 0; i < origKeys.length; ++i) {
    let   key     = origKeys[i];
    let   snaked  = snake_case(key);

    if (key !== snaked) {
      argv[snaked] = argv[key];
    }
  }

  // Augment
  argv._plus = function(more) {
    _.each(more, (v,k) => {
      argv[k] = v;
    });

    return argv;
  };

  argv._get = function(...args) {
    return argvGet(argv, ...args);
  };

  argv.i = function(msg, one='', two='', ...args) {
    if (argv.quiet) { return; }
    return sg.log(msg, one, two, ...args);
  };

  argv.i_if = function(test, msg, one='', two='', ...args) {
    if (argv.quiet || !test) { return; }
    return sg.log(msg, one, two, ...args);
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

  argv.w = function(msg, one='', two='', ...args) {
    return sg.warn(msg, one, two, ...args);
  };

  argv.w_if = function(test, msg, one='', two='', ...args) {
    if (!test) { return; }
    return sg.warn(msg, one, two, ...args);
  };

  argv.iv = function(msg, i_params, v_params) {
    if (argv.verbose) {
      return argv.v(msg, {...i_params, ...v_params});
    }

    return argv.i(msg, i_params);
  };

  argv.iv_if = function(test, ...rest) {
    if (!test) { return; }
    return argv.iv(...rest);
  };

  argv.pod = function() {
    return sg.reduce(argv, {}, (m,v,k) => {
      if (_.isFunction(v))  { return m; }

      return sg.kv(m, k, v);
    });
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
 * @param {string[]} args - A list of cli-parameters, like from `process.argv`.
 * @param {Object}   argv - Output Object of any parameters found, that `minimist` cannot parse.
 *
 * @returns {string[]} The remainder parameters.
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
 * @param {Object}   argv     - The Object-ified ARGV-like object to get a parameter from.
 * @param {string[]} names    - The list of names to look up. Only the first one found is returned.
 * @param {Object}   options  - Options to control what is gotten.
 *
 * @returns {string|Object}     The looked-up value, which will be whatever type it is, but usually a String when handling cli-parameters.
 */
function argvGet(argv, names, options) {
  return sg.reduce(names.split(','), null, (m, name) => {
    if (m)  { return m; }

    if (name in argv && !(typeof argv[name] === 'function')) {
      // return sg.kv(m, name, argv[name]);
      return argv[name];
    }
  });
}

function figureOutFile(filename_) {
  var   filename  = filename_;
  var   stats     = fs.statSync(filename);

  if (stats.isFile()) {
    return filename;
  }

  filename  = path.join(process.cwd(), filename);
  stats     = fs.statSync(filename);

  if (stats.isFile()) {
    return filename;
  }

}

