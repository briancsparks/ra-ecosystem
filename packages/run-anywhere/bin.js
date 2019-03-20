#!/usr/bin/env node

/**
 *  The binary for the 'ra' command.
 *
 *  This file gets invoked when the user uses the 'ra' command at the
 *  bash prompt.
 */


// -------------------------------------------------------------------------------------
//  requirements
//

var sg                      = require('sgsg');
var _                       = sg._;
var path                    = require('path');
var ra                      = require('./ra');
const runAnywhereV2         = require('./lib/rav2');

var fs                      = sg.fs;

// -------------------------------------------------------------------------------------
//  Data
//
var commands = {};

var ARGV  = sg.ARGV();


// -------------------------------------------------------------------------------------
//  Functions
//


/**
 *  This is the main function that gets invoked if the user runs the `ra` command.
 *
 *  It simply looks up the requested function in its `commands` object, and calls it.
 */
var main = function() {
  var command = ARGV.args.shift();

  if (commands[command]) {
    return commands[command]();
  }

  /* otherwise -- unknown command */
  console.error("Unknown command, known commands: ", _.keys(commands));
};

commands['invoke-script'] = commands.invokeScript = commands.invokescript = function() {
  var moduleName      = ARGV.args.shift();
  var functionName    = ARGV.args.shift();
  var moduleDirname;

  if (!moduleName || !functionName) {
    console.error("Must provide module and function names");
    process.exit(1);
    return;
  }

  var name = path.join(process.env.HOME, 'dev', moduleName);
  if (fs.test('-d', name))  { moduleDirname = name; }

  if (!moduleDirname) {
    name = path.join(process.env.HOME, 'dev', 'b', moduleName);
    if (fs.test('-d', name))  { moduleDirname = name; }
  }

  if (!moduleDirname) {
    console.error("module "+moduleDirname+" failed to be required");
    process.exit(1);
    return;
  }

  runAnywhereV2.utils.setQuiet(true);

  var raScripts = ra.loadScripts(moduleDirname);
//  console.log(raScripts);

  var fn = raScripts[functionName];
  if (!_.isFunction(fn)) {
    fn = raScripts.models[functionName];
  }

  if (!_.isFunction(fn)) {
    console.error("function "+functionName+" not found.");
    process.exit(1);
    return;
  }

  return invoke(ARGV, fn, moduleName+"::"+functionName);
};

/**
 *  The workhorse invoke() function.
 *
 *  This is the function that parses the command line, finds, and loads the requested
 *  script. Then it calls `ra.js` invoking the `invoke` function.
 */
commands.invoke = function() {
  var moduleFilename  = ARGV.args.shift();
  var functionName    = ARGV.args.shift();

  if (!moduleFilename || !functionName) {
    console.error("Must provide module and function names");
    process.exit(1);
    return;
  }

  runAnywhereV2.utils.setQuiet(true);

  /* otherwise */
  var mod = raInvokeRequire(moduleFilename);
  if (!mod) {
    console.error("module "+moduleFilename+" failed to be required");
    process.exit(1);
    return;
  }

  /* otherwise */

  var fn = mod[functionName];
  if (!fn) {
    console.error("function "+functionName+" not found. "+"Found: "+_.keys(mod));
    process.exit(1);
    return;
  }

  /* otherwise */
  return invoke(ARGV, fn, moduleFilename+"::"+functionName);
};

/**
 *  The workhorse invoke2() function.
 *
 *  This is the function that parses the command line, finds, and loads the requested
 *  script. Then it calls `ra.js` invoking the `invoke2` function.
 *
 */
commands.invoke2 = function() {
  require('loud-rejection/register');
  require('exit-on-epipe');
  const sg    = require('sg-argv');
  const ARGV  = sg.ARGV();

  const silent    = ARGV._get('silent,s');
  const debug     = ARGV._get('debug,d');
  const verbose   = ARGV._get('verbose,v');
  const machine   = ARGV._get('machine,m');
  const human     = ARGV._get('human,r');

  if (debug || verbose) { sg.mkInspect({fancy:true}); }

  const [
    command,
    moduleFilename,
    fname
  ]                       = ARGV._;

  if (!moduleFilename || !fname) {
    console.error("Must provide module and function names");
    process.exit(1);
    return;
  }

  if (silent) { runAnywhereV2.utils.setQuiet(true); }

  /* otherwise */
  var mod = raInvokeRequire(moduleFilename);
  if (!mod) {
    console.error("module "+moduleFilename+" failed to be required");
    process.exit(1);
    return;
  }

  /* otherwise */
  // Otherwise, run it
  return ra.invoke2(ARGV.pod(), mod, fname, function(err, ...rest) {
    var exitCode = 0;

    // Is there an error?
    if (err) {

      exitCode = 1;

      // Log it unless silent
      if (!silent) {
        console.error(err);
      }
    }

    // If we only got an error object, were done
    if (arguments.length === 1) {
      process.exit(exitCode);
      return;
    }

    // For humans
    if (human) {
      sg.debugLog(fname, ...rest);
      return;
    }

    // Machine output?
    if (machine) {
      _.each(rest, (result) => {
        if (!_.isString(result)) {
          process.stdout.write(JSON.stringify(result) + '\n');
          return;
        }

        process.stdout.write(result + '\n');
      });

      return;
    }

    /* otherwise -- machine-ish */
    _.each(rest, (result) => {
      if (!_.isString(result)) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
      }

      process.stdout.write(result + '\n');
    });
  });
};

/**
 *  The validate() function.
 *
 */
commands.validate = function() {
  var moduleFilename  = ARGV.args.shift();
  var functionName    = 'ra-validate';

  if (!moduleFilename || !functionName) {
    console.error("Must provide module and function names");
    process.exit(1);
    return;
  }

  runAnywhereV2.utils.setQuiet(true);

  /* otherwise */
  var mod = raInvokeRequire(moduleFilename);
  if (!mod) {
    console.error("module "+moduleFilename+" failed to be required");
    process.exit(1);
    return;
  }

  /* otherwise */

  var fn = mod[functionName];
  if (!fn) {
    console.error("function "+functionName+" not found. "+"Found: "+_.keys(mod));
    process.exit(1);
    return;
  }

  /* otherwise */
  return invoke(ARGV, fn, moduleFilename+"::"+functionName);
};

// -------------------------------------------------------------------------------------
//  Helper functions
//

function invoke(argv_, fn, msg) {
  var argv = argv_;

  if (_.isFunction(argv.getParams)) {
    argv = argv.getParams({});
  }

  if (argv.ra_file) {
    let jsonfile = argv.ra_file;
    argv = require(jsonfile);
  }

  var params    = {};
  params.params = _.omit(argv, 'args');

  _.each(argv.args, function(arg, n) {
    params.params['arg'+n] = arg;
  });

  var spec      = {};
  return ra.invoke(params, spec, fn, function(err) {
    var exitCode = 0;

    if (err) {
      exitCode = 1;
      console.error(err, "Error invoking: "+msg);
    }

    if (arguments.length === 1) {
      process.exit(exitCode);
      return;
    }

    if (arguments.length === 2) {
      if (_.isString(arguments[1])) {
        process.stdout.write(arguments[1]+'\n');
      } else {
        process.stdout.write(JSON.stringify(arguments[1])+'\n');
      }
      return;
    }

    /* otherwise */
    process.stdout.write(JSON.stringify(_.drop(arguments))+'\n');
    process.exit(exitCode);
  });
}

commands.ls = function() {
  var moduleFilename  = ARGV.args.shift();

  if (!moduleFilename) {
    console.error("Must provide module (.js file)");
    process.exit(1);
    return;
  }

  /* otherwise */
  var mod = raInvokeRequire(moduleFilename);
  if (!mod) {
    console.error("module "+moduleFilename+" failed to be required");
    process.exit(1);
    return;
  }

  /* otherwise -- look at 'mod' and display functions */
  var args = ['\\(\\s*argv\\s*,\\s*context\\s*,\\s*callback\\s*\\)', moduleFilename];

  return sg.exec('grep', args, function(error, exitCode, stdoutChunks, stderrChunks, signal) {
    var lines = stdoutChunks.join('').split('\n');

    lines = _.compact(_.map(lines, function(line) {
      var m = line.match(/([a-z0-9_]+)\s*=\s*function\(([^)]+)\)/i);
      if (m) {
        return m[1];
      }

      // TODO: match function xyz(...) style
    }));

    _.each(lines, function(line) {
      process.stdout.write(line+'\n');
    });
  });
};

const argv1 = _.last(process.argv[1].split('/'));
if (process.argv[1] === __filename || argv1.match(/bin.js$/) || argv1 === 'ra' || argv1 === 'run-anywhere') {
  return main();
}

/**
 *  A require() function for use by invoke.
 */
function raInvokeRequire(name_) {
  var name = name_;
  var mod;

  // check name
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/name
  name = path.join(process.cwd(), name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/lib/name
  name = path.join(process.cwd(), 'lib', name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/../lib/name
  name = path.join(process.cwd(), '..', 'lib', name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/../../lib/name
  name = path.join(process.cwd(), '..', '..', 'lib', name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  return mod;
}

function raInvokeRequireOne(name) {
  var mod;

  try {
    mod = require(name);
  } catch(e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      console.error(e);
    }
  }

  return mod;
}



