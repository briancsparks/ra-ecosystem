
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
// const ra0                     = require('../..');
// const ra                      = ra0.v2;
const sg0                     = require('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-clihelp'));
const { _ }                   = sg;

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.command = function(ARGV = sg.ARGV(), mods = {}, fnName, opts={}, commands = {}, callback=null) {
  require('loud-rejection/register');
  require('exit-on-epipe');

  const modfilename   = opts.modfilename || opts.__filename;

  const silent        = ARGV._get('silent,s');
  const debug         = ARGV._get('debug,d');
  const verbose       = ARGV._get('verbose,v');
  const machine       = ARGV._get('machine,m');
  const human         = ARGV._get('human,r');

  // Do we have a simple command?
  const command = commands[fnName];
  if (_.isFunction(command)) {
    return command();
  }

  if (cleanExit(ARGV, modfilename, fnName, 'ENOFUNCTION', `Must provide a function name`))      { return false; }

  // Try to find the function in the modules
  const mod = sg.reduce(mods.mods || mods, null, (m0, theMod0) => {

    const theMod = isTheMod(m0, theMod0);
    if (theMod) {
      return theMod;
    }

    return sg.reduce(theMod0.mods || theMod0, m0, (m, theMod) => {
      return isTheMod(m, theMod);
    });

    function isTheMod(m, mod) {
      let fn = mod[fnName];
      if (_.isFunction(fn)) {
        if (m)        { sg.warn(`Duplicate ${fnName} functions in ${mod.modname || 'some_mod'} and ${m.modname || 'some_other_mod'}`); }

        return mod;
      }

      return m;
    }
  });

  if (cleanExit(ARGV, modfilename, mod, 'ENOFNINMODS', `Could not find function ${fnName} in mods`))      { return false; }


  // Otherwise, run it
  return invoke2(ARGV.pod(), mod, fnName, function(err, ...rest) {
    var exitCode = 0;

    // Is there an error?
    if (err) {
      exitCode = 1;

      // Log it unless silent
      if (!silent) {
        console.error(...sg.logParams(`EINVOKE2 -- ${fnName} failed.`, err));
      }
    }

    if (callback) {
      return callback(err, ...rest);
    }

    // If we only got an error object, we are done
    if (arguments.length === 1) {
      process.exit(exitCode);
      return;
    }

    // For humans
    if (human) {
      sg.debugLog(fnName, ...rest);
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

// -------------------------------------------------------------------------------------
// exports
//
exports.invoke2 = invoke2;

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function cleanExit(ARGV, modfilename, condition, code, msg) {
  if (sg.startupDone(ARGV, modfilename, !condition, `${code || 'ENOSOMETHING'} -- ${msg || 'fail.'}`)) {
    return true;
  }

  return false;
}

function noop(){}

function invoke2(argv, mod, fname, callback, abort_) {

  // Get args
  const debug   = argv.debug;
  const verbose = argv.verbose;

  var   context = {
    isRaInvoked:  true
  };

  // Load up the function
  const sg0   = require('sg-flow');
  const ROOT  = require('./mod-squad').modSquad({exports:{}}, 'ROOT');
  const init  = ROOT.xport({root: function(argv, context, callback) {

    const ractx     = context.runAnywhere || {};
    const { rax }   = ractx.ROOT__root;

    return rax.iwrap(abort_, function(abort) {
      const fns = rax.loads(mod, fname, sg0.merge({debug, verbose}), abort);
      const fn  = fns[fname];

      //console.error(`invoking ${fname}`, sg.inspect({argv, context}));
      return fn(argv, context, callback);
    });
  }});

  return init(argv, context, function(err, data, ...rest) {
    return callback(err, data, ...rest);
  });
}

