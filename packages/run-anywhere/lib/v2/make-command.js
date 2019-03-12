
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg0                     = require('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-clihelp'));
const { _ }                   = sg;
const libThreeContext         = require('./three-context');

const ensureThreeContext      = libThreeContext.ensureThreeContext;

// -------------------------------------------------------------------------------------
//  Data
//


// -------------------------------------------------------------------------------------
//  Functions
//

/**
 *
 *
 * @param {*} [ARGV=sg.ARGV()]    - The standard ARGV.
 * @param {*} [mods={}]           - Run-anywhere modules that contain the fnName function.
 * @param {*} fnName              - The name of the command to run.
 * @param {*} [opts={}]           - Options
 * @param {*} [commands={}]       - A map of functions.
 * @param {*} [callback=null]     - The normal NodeJs continuation callback.
 *
 * @returns {null}                - [[return is only used for control-flow.]]
 */
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
  return invoke0(ARGV.pod(), mod, fnName, function(err, ...rest) {
    var exitCode = 0;

    // Is there an error?
    if (err) {
      exitCode = 1;

      // Log it unless silent
      if (!silent) {
        console.error(...sg.logParams(`EINVOKE0 -- ${fnName} failed.`, err));
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
exports.invoke0 = invoke0;
exports.invoke  = invoke;

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

function invoke0(argv, mod, fname, callback, abort_) {

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

function invoke(opts, argv, ractx, callback, abort_) {
  sg.check(42, __filename, {opts}, 'mod;fnName;hostModName;hostMod', {argv}, {ractx}, 'context');

  const {
    mod, fnName, hostModName, hostMod
  }                     = opts;

// console.log(`invoke1, ractx keys, context keys`, sg.keys(ractx), sg.keys((ractx && ractx.context) || {}));

  var   modjule               = {exports:{}};
  const ra                    = require('./mod-squad');
  const ROOT                  = ra.modSquad(modjule, `${hostModName}ROOT`);

  // Get args
  const {
    debug, silent, verbose, machine, human
  }                                             = argv;
  const options1 = sg.merge({debug, silent, verbose, machine, human});

  // Load up the function
  ROOT.xport({invoke: function(argv, context, callback) {
    sg.check(43, __filename, {argv}, {context}, 'runAnywhere');
  // console.log(`invoke4, ractx keys, context keys`, sg.keys((context && context.runAnywhere) || {}), sg.keys(context));

    const { rax }    = ra.getContext(context, argv, 0);

    const iwrapArgs = _.compact([abort_, function(abort) {
      const fns = rax.loads(mod, fnName, options1, abort);
      const fn  = fns[fnName];

      return fn(argv, context, callback);
    }]);

    return rax.iwrap(...iwrapArgs);
  }});

  const caller = ROOT.xport({caller: function(argv, context, callback) {
    sg.check(44, __filename, {argv}, {context}, 'runAnywhere');
// console.log(`invoke3, ractx keys, context keys`, sg.keys((context && context.runAnywhere) || {}), sg.keys(context));

    const { rax }       = ra.getContext(context, argv, 0);
    const { invoke }    = rax.loads('invoke', {}, function(){});

    return invoke(argv, {}, callback);
  }});


  // --------------------------------------------------------

  // Build up or get the context
  const { context } = ensureThreeContext(ractx.context || {});
// console.log(`invoke2, ractx keys, context keys`, sg.keys((context && context.runAnywhere) || {}), sg.keys(context));

  return caller(argv, context, function(err, data, ...rest) {
    return callback(err, data, ...rest);
  });
}

