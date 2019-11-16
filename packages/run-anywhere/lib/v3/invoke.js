
const sg                      = require('sg-argv');
const path                    = require('path');
const libGlob                 = require('glob');
const {sprintf}               = require('sprintf-js');

const libThreeContext         = require('../v2/three-context');

const {
  ensureThreeArgvContext
}                             = libThreeContext;

// module.exports.extendFnTable  = extendFnTable;
module.exports.invoke_v2      = invoke_v2;
module.exports.run_v2         = run_v2;
module.exports.safeRequire    = safeRequire;

// ----------------------------------------------------------------------------------------------------------------------------
const globIgnore = [
  '**/node_modules/**',
  '**/__tests__/**',
  '**/__test__/**',
  '**/*.test.js'
];

function relativify(filename, dir) {
  if (path.isAbsolute(filename)) {
    return path.relative(dir, filename);
  }
  return filename;
}

// ----------------------------------------------------------------------------------------------------------------------------
function run_v2(sys_argv, fnName, argv_, callback) {
  var {fnTable}   = sys_argv;
  let {filelist}  = sys_argv;
  let {glob}      = sys_argv;
  var {cwd}       = sys_argv;
  var argv        = {...argv_};

  if (sg.isnt(fnTable)) {
    if (filelist) {
      fnTable = sg.reduce(filelist, fnTable ||{}, (table, filename) => {
        return extendFnTable(table, null, filename, process.cwd());
      });

      return run_v2({fnTable}, fnName, argv_, callback);
    }
  }

  if (sg.isnt(fnTable)) {
    if (glob) {
      cwd     = cwd || process.cwd();
      const options = {
        ignore    : [...globIgnore, ...(sys_argv.ignore ||[])].map(x => relativify(x, cwd)),
        cwd,
      };

      // console.log(`invoke-glob`, sg.inspect({options, ignore: sys_argv.ignore}));
      return libGlob(glob, options, function(err, filelist) {
        // console.log(sg.inspect({err, filelist}));
        return run_v2({filelist}, fnName, argv_, callback);
      });
    }
  }

  return invokeIt_v2();

  // =====================================================================================
  function invokeIt_v2() {

    if (sg.isnt(fnTable)) {
      return callback(`ENOFN`);
    }

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
function extendFnTable(table, mod_, filename, dirname) {
  if (filename) {

    let mod = safeRequire(path.join(dirname, filename));
    if (!mod) {
      // TODO: Use this to make 'ra3 checkRequires' -- to walk through a package and require everything, hoping not to get this message
      sg.logError(`Cannot require(${filename})\n\nuse to see:\n  node ${filename}\n----------------\n\n`, 'ENOENT ==>');

    } else {
      sg._.each(mod, (value,fnName) => {
        if (typeof value === 'function') {
          // if (value.length !== 3) {
          //   sg.elog(sprintf(`Skipping (Arity %2d) %-29s %s`, value.length, fnName, (''+value).split('\n')[0]));
          // }

          const arity       = value.length;
          const hasAsync    = !!(mod && mod.async && typeof mod.async[fnName] === 'function');
          const score       = scoreRaFnSignature(value);
          var   entry       = {arity, hasAsync, ...score, fn: value, filename};

          // sg.elog(sprintf(`Adding %-29s %j %s`, fnName, entry, (''+value).split('\n')[0]));

          table[fnName] = {mod, ...entry};
        } else {
          // sg.elog(`[[so says ${__filename}]]: "${fnName}"  is not a function while loading ${filename}: (it is a ${typeof value})`);
        }
      });
    }
  }

  return table;
}

// ----------------------------------------------------------------------------------------------------------------------------
function scoreRaFnSignature(fn) {
  var   arity   = fn.length;
  const first   = (''+fn).split('\n')[0];       /* First line of function (string) */
  var   params  = first.match(/\(([^)]+)\)/);   /* Parameters to function (regex) */

  params = (params && params[1]) ||'';          /* Parameters to function (string) */
  params = params.split(/,\s*/g);               /* Parameters to function (array<string>) */

  // Are the names to the function right?
  var   names = true;
  if (arity > 0 || params.length > 0) {       names = names && (':argv:event:req:'.indexOf(`:${params[0] = cleanParam(params[0])}:`) !== -1); }
  if (arity > 1 || params.length > 1) {       names = names && (':context:res:'.indexOf(`:${params[1] = cleanParam(params[1])}:`) !== -1); }

  if (arity > 2 || params.length > 2) {       names = names && (':callback:cb:rest:'.indexOf(`:${params[2] = cleanParam(params[2])}:`) !== -1);
    if (names && params[2] !== 'rest') {
      arity = Math.max(arity, 3);
    }
  }

  return {arity, names};
}

// ----------------------------------------------------------------------------------------------------------------------------
function cleanParam(name) {
  const clean = name.split('=')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return clean;
}

// ----------------------------------------------------------------------------------------------------------------------------
function findFn(fnTable, fnName) {
  if (!fnTable || !fnName)  { return; }

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
function safeRequire(...paths) {
  try {
    return require(path.join(...paths));
  } catch(err) {}
}

// ----------------------------------------------------------------------------------------------------------------------------
function sm(x) {
  if (x) {
    return [x];
  }

  return [];
}


