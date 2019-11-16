
const sg                      = require('sg-argv');
const path                    = require('path');
const libGlob                 = require('glob');

const libThreeContext         = require('../v2/three-context');

const {
  ensureThreeArgvContext
}                             = libThreeContext;

// module.exports.extendFnTable  = extendFnTable;
module.exports.invoke_v2      = invoke_v2;
module.exports.run_v2         = run_v2;


// ----------------------------------------------------------------------------------------------------------------------------
function run_v2(source, fnName, argv_, callback) {
  var {fnTable}   = source;
  var argv        = {...argv_};
  let {filelist}  = source;
  let {glob}      = source;

  if (sg.isnt(fnTable)) {

    if (filelist) {
      fnTable = sg.reduce(filelist, fnTable ||{}, (table, filename) => {
        return extendFnTable(table, null, filename, process.cwd());
      });

      return run_v2({fnTable}, fnName, argv_, callback);
      // return invokeIt_v2();
    }
  }

  if (sg.isnt(fnTable)) {
    ({glob, ...argv} = argv);
    if (glob) {
      // TODO: ...
      return libGlob(glob, {ignore: '**/node_modules/**'}, function(err, filelist) {
console.log(`globbed ${glob}`, {err, filelist});

        return run_v2({filelist}, fnName, argv_, callback);
      });
    }
  }

  return invokeIt_v2();

  // =====================================================================================
  function invokeIt_v2() {

    run_v2FromTable(fnTable, fnName, argv, onResult /* TODO: , abort, options*/);

    // =====================================================================================
    function onResult(err, data, ...rest) {
      // console.log(`invokeit-cb`, sg.inspect({fnTable, fnName, argv, err, data, rest}));
      console.log(`run_v2-cb`, sg.inspect({err, data, rest}));
      return callback(err, data, ...rest);
    }
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
function run_v2FromTable(fnTable, fnName, argv, callback, ...rest) {
  const lib                   = findFn(fnTable, fnName);
  if (!lib)                                             { return callback(`ENOFN`); }

  return invoke_v2(lib, fnName, argv, callback, ...rest);
}

// ----------------------------------------------------------------------------------------------------------------------------
function invoke_v2(lib, fnName, argv_, callback, abort, options_ ={}) {
  const fn = lib[fnName];
  if (!fn)                                { return callback(`ENOFN`); }

  // Load up the function
  var   modjule               = {exports:{}};
  const ra                    = require('../v2/mod-squad');
  const mod                   = ra.modSquad(modjule, 'invoke_v2_root');
  var   init;

  var   argv = sg.argvPod(argv_);

  // Get args
  const {
    debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human
  }               = argv;
  const options  = sg.merge({...options_, debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human});

  // Will get invoked at the bottom of this function
  const invoke_v2_main = function() {

    // Build up or get the context
    var   context_ = {
      isRaInvoked:    true,
      invokedFnName:  fnName
    };

    const { event, context } = ensureThreeArgvContext(argv, context_);    // Add , initialParams to set specific things on context

    // Call the `init` wrapper function
    return init(event, context, function(err, data, ...rest) {
      // Could log here, or just pass callback to init
      return callback(err, data, ...rest);
    });
  };

  // The wrapper to get context, rax, et. al. involved.
  init = mod.xport({init: function(argv, context, callback) {
    const {rax}    = ra.getContext(context, argv /* , 1 gets more: {isApiGateway,isAws} */);

    return rax.iwrap(...[...sm(abort), function(abort) {
      const fn  = rax.loads2(lib, fnName, options, abort)[fnName];

      return fn(argv, rax.opts({}), callback);
    }]);
  }});

  invoke_v2_main();
}

// ----------------------------------------------------------------------------------------------------------------------------
function extendFnTable(table, mod, filename, dirname) {
  if (filename) {
    let mod = safeRequire(path.join(dirname, filename));
    if (!mod) {
      // sg.logError(`ENOENT`, filename, {filename});
      sg.logError(`Cannot require(${filename})\n\nuse to see:\n  node ${filename}\n----------------\n\n`, 'ENOENT ==>');
    } else {
      sg._.each(mod, (value,fnName) => {
        if (typeof value === 'function') {
          table[fnName] = {fn: value, mod, filename};
        } else {
          sg.elog(`Loading ${filename}: ${fnName} is not a function (${typeof value}) [[so says ${__filename}]]`);
        }
      });
    }
  }

  return table;
}

// ----------------------------------------------------------------------------------------------------------------------------
function findFn(fnTable, fnName) {

  const item = fnTable[fnName];
  if (!item)                          { return; }

  if (typeof item === 'function') {
    return mkMod(item);
  }

  if (item.mod && item.mod[fnName]) {
    if (typeof item.mod[fnName] === 'function') {
      return item.mod;
    }
  }

  if (typeof item.fn === 'function') {
    return mkMod(item.fn);
  }

  if (item.filename) {
    return safeRequire(item.filename);
  }

  function mkMod(fn) {
    return {[fnName]: fn};
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
function safeRequire(filename) {
  try {
    return require(filename);
  } catch(err) {}
}

// ----------------------------------------------------------------------------------------------------------------------------
function sm(x) {
  if (x) {
    return [x];
  }

  return [];
}


