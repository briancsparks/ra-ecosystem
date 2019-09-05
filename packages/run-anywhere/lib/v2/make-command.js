if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

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
const { omitDebug }           = require('../utils');

const { ensureThreeArgvContext }    = libThreeContext;

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
  return exports.command2(ARGV, mods, {}, [], fnName, opts, commands, callback);
};

/**
 *
 *
 * @param {*} [ARGV=sg.ARGV()]    - The standard ARGV.
 * @param {*} [loadedMods={}]     - Run-anywhere modules that contain the fnName function.
 * @param {*} [modFnMap={}]       - Map of mod to the functions they contain.
 * @param {*} [allMods=[]]        - Array of module filenames to look into.
 * @param {*} fnName_             - The name of the command to run.
 * @param {*} [opts={}]           - Options
 * @param {*} [commands={}]       - A map of functions.
 * @param {*} [callback=null]     - The normal NodeJs continuation callback.
 *
 * @returns {null}                - [[return is only used for control-flow.]]
 */
exports.command2 = function(ARGV = sg.ARGV(), loadedMods = {}, modFnMap={}, allMods=[], fnName_, opts={}, commands = {}, callback=null) {   // CODE_INDEX: Your commands run with `ra invoke`
  require('loud-rejection/register');
  require('exit-on-epipe');

  const fnName        = fnName_   || ARGV.function || ARGV.fn || ARGV._[0];

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
  const mod = findMod(loadedMods, modFnMap, allMods, fnName);

  if (cleanExit(ARGV, modfilename, mod, 'ENOFNINMODS', `Could not find function ${fnName} in mods`))      { return false; }

  // Otherwise, run it
  const invokeCallback = function(err, ...rest) {
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
  };

  const invoke = sg.extract(opts, 'invoke') || invoke0;
  return invoke(ARGV.pod(), mod, fnName, invokeCallback, /*abort=*/null, {invoke0, ...opts});
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

function invoke0(argv, mod, fnName, callback, abort_, options={}) {   // CODE_INDEX: Your commands run via `ra invoke` -- the invoke part

  // Fix argv -- remove the first param, if it is fnName
  if (Array.isArray(argv._) && argv._[0] === fnName) {
    argv._.shift();
  }

  var   passAlong = {mod, fnName};

  // Load up the function
  var   modjule               = {exports:{}};
  const ra                    = require('./mod-squad');
  const ROOT                  = ra.modSquad(modjule, 'commandROOT');

  // Get args
  const {
    debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human
  }               = argv;
  const options1  = sg.merge({debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human});
  options1.abort  = ('abort' in options1 ? options1.abort : true);

  const init = ROOT.xport({init: function(argv, context, callback) {

    const raContext  = ra.getContext(context, argv, 0);
    const { rax }    = raContext;

    return rax.iwrap(..._.compact([abort_, function(abort) {
      const fns = rax.loads2(mod, fnName, options1, abort);
      const fn  = fns[fnName];

      if (options.fn) {
        passAlong = { ...passAlong, rax, ...options1 };
        return options.fn({raContext, fn, abort, ...passAlong}, argv, rax.opts({}), callback);
      }

      return fn(argv, rax.opts({}), callback);
    }]));
  }});

  // --------------------------------------------------------

  // Build up or get the context
  var   context_ = {
    isRaInvoked:    true,
    invokedFnName:  fnName
  };

  const { event, context } = ensureThreeArgvContext(argv, context_);

  return init(event, context, function(err, data, ...rest) {
    return callback(err, data, ...rest);
  });
}

function invoke(opts, options, argv, ractx, callback, abort_) {
  sg.check(42, __filename, {opts}, 'mod;fnName;hostModName;hostMod', {argv}, {ractx}, 'context');

  const {
    mod, fnName, hostModName
  }                     = opts;

  var   modjule               = {exports:{}};
  const ra                    = require('./mod-squad');
  const ROOT                  = ra.modSquad(modjule, `${hostModName}ROOT`);

  // Get args
  const {
    debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human
  }              = argv;
  const options1 = sg.merge({debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human}, options || {});
  options1.abort   = ('abort' in options1 ? options1.abort : true);

  // Load up the function
  ROOT.xport({invoke: function(argv, context, callback) {
    sg.check(43, __filename, {argv}, {context}, 'runAnywhere');

    const { rax }    = ra.getContext(context, argv, 0);

    const iwrapArgs = _.compact([abort_, function(abort) {
      const fns = rax.loads2(mod, fnName, options1, abort);
      const fn  = fns[fnName];

      return fn(argv, rax.opts({}), callback);
    }]);

    return rax.iwrap(...iwrapArgs);
  }});

  // TODO: is this second wrapper needed?
  const caller = ROOT.xport({caller: function(argv, context, callback) {
    sg.check(44, __filename, {argv}, {context}, 'runAnywhere');

    const { rax }       = ra.getContext(context, argv, 0);
    const { invoke }    = rax.loads2('invoke', {}, abort_ || function(){});

    return invoke(argv, callback);
  }});


  // --------------------------------------------------------

  // Build up or get the context
  const { event, context } = ensureThreeArgvContext(sg.merge(ractx.event || {}, argv), ractx.context || {});

  return caller(event, context, function(err, data, ...rest) {
    return callback(err, data, ...rest);
  });
}

/**
 * Find the mod that contains the function `fnName`.
 *
 * A mod is a loaded js file (const mod = require(filename))
 *
 * @param {Array}   [mods=[]]       -- Already-loaded module list.
 * @param {Object}  [modFnMap={}]   -- Filename-to-fnName mapping
 * @param {Array}   [allMods=[]]    -- Array of filenames to blindly check
 * @param {string}  fnName          -- Function name
 *
 * @returns {module}
 */
function findMod(mods = [], modFnMap={}, allMods=[], fnName) {            // CODE_INDEX: the fn that determines the fn within mods for ra to invoke
  var mod;    // Returned

  // Full list of everything we have seen, to show if we do not find the function
  var   available = {};

  // Returns the first filename that contains the fnName function
  var   modFilename = sg.reduce(modFnMap, null, (m, v, modName) => {
    available[v.filename] = [...(available[v.filename] ||[]), ...v.fnNames];    // Remember what we have seen

    if (m)  { return m; }                 // Just find the first one

    // Is the fnName that we are looking for in the list of fnNames for this filename?
    if (v.fnNames.indexOf(fnName) !== -1) {
      return v.filename;
    }

    // Not found, just return what we already have (null)
    return m;
  });

  // We have a guess at the module filename... load it and verify
  if (modFilename) {
    if (isTheMod(null, (mod = require(modFilename)))) {
      return mod;
    }
  }

  // allMods is a collection of filenames of mods
  modFilename = sg.reduce(allMods, null, (m, filename) => {
    const mod = require(filename);
    available[filename] = [...(available[filename] ||[]), ...sg.keys(mod.async)];

    if (isTheMod(null, mod)) {
      return filename;
    }
    return m;
  });

  // We have another guess at the module filename... load it and verify
  if (modFilename) {
    if (isTheMod(null, (mod = require(modFilename)))) {
      return mod;
    }
  }

  // This is a list (or maybe a list of lists) of already-loaded mods. Check them to see if they have our fnName
  mod = sg.reduce(mods.mods || mods, null, (m0, theMod0) => {

    const theMod = isTheMod(m0, theMod0);
    if (theMod) {
      return theMod;
    }

    return sg.reduce(theMod0.mods || theMod0, m0, (m, theMod) => {
      return isTheMod(m, theMod);
    });
  });

  if (!mod) { sg.elog(`Fail to load fn ${fnName}`, available); }
  return mod;

  function isTheMod(m, mod) {
    let fn = mod[fnName];
    if (_.isFunction(fn)) {
      if (m)        { sg.warn(`Duplicate ${fnName} functions in ${mod.modname || 'some_mod'} and ${m.modname || 'some_other_mod'}`); }

      return mod;
    }

    return m;
  }
}



