
const sg                      = require('sg-flow');
const path                    = require('path');
const fs                      = require('fs');
const libGlob                 = require('glob');
const {sprintf}               = require('sprintf-js');
const {logSmData}             = require('./utils');

const libThreeContext         = require('../v2/three-context');

const {
  ensureThreeArgvContext
}                             = libThreeContext;


module.exports.build_fnTableSmart   = build_fnTableSmart;
module.exports.build_fnTable        = build_fnTable;
module.exports.invoke_v2            = invoke_v2;
module.exports.run_v2               = run_v2;
module.exports.safeRequire          = safeRequire;

sg._extend(module.exports, require('./bin/utils'));                 // get `extractSysArgv`, `extractSysArgvNamed`

// ----------------------------------------------------------------------------------------------------------------------------
const globIgnore = [
  '**/node_modules/**',
  '**/__tests__/**',
  '**/__test__/**',
  'tests/**',
  'test/**',
  '**/*.test.js'
];

// ----------------------------------------------------------------------------------------------------------------------------
// Get the fnTable. (1) build it, and (2) load it. compare
function build_fnTableSmart(sys_argv, callback) {
  var cwd     = sys_argv.cwd        || process.cwd();
  var fnName  = sys_argv.fnName;

  var errors = [];
  var builtFnTable, readFnTable, theFnTable;

  const doneOnce = sg._.once(done);

  return sg.__run([function(next) {
    return next();
  }, function(next) {

    return fs.readFile(path.join(cwd, `run-anywhere-fntable.json`), 'utf8', function(err, data) {

      if (sg.ok(err, data)) {
        let fnTable = sg.safeJSONParse(data);
        if (fnTable) {
          readFnTable = theFnTable = fnTable;

          // console.log(`build_fnTableSmart-readFile`, {fns: (fnTable && Object.keys(fnTable))});
          // console.log(`build_fnTableSmart-readFile`, {fn:  (fnTable && fnTable[fnName])});
          if (fnName && fnTable && fnTable[fnName]) {
            doneOnce(fnTable);
          }
        }
      }

      return next();
    });

  }, function(next) {
    if (fnName && theFnTable && theFnTable[fnName])         { return next(); }

    return build_fnTable({...sys_argv}, function(err, fnTable) {
      if (err)  { errors.push(err); return next(); }

      builtFnTable = theFnTable = fnTable;

      // console.log(`build_fnTableSmart-require`, {fns: (fnTable && Object.keys(fnTable))});
      // console.log(`build_fnTableSmart-require`, {fn:  (fnTable && fnTable[fnName])});
      if (fnName && fnTable && fnTable[fnName]) {
        doneOnce(fnTable);
      }

      return next();
    });

  }], function() {
    // TODO: compare results, report or update file
    return doneOnce();
  });

  function done() {
    errors = sg.compact(errors);
    errors = errors.length === 0 ? null : errors[0];

    return callback(errors, builtFnTable || readFnTable || (!errors && {}));
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
function build_fnTable(sys_argv, callback) {

  if (!sg.isnt(sys_argv.fnTable)) {
    if (sys_argv.verbose) { console.log(`Finished build_fnTable`); }
    return callback(null, sys_argv.fnTable);
  }

  var {fnTable}   = sys_argv;
  let {filelist}  = sys_argv;
  let {glob}      = sys_argv;
  var {cwd}       = sys_argv;
  var {reqFailFn} = sys_argv;

  if (filelist) {
    if (sys_argv.verbose) { console.log(`Starting build_fnTable: requiring`); }

    fnTable = sg.reduce(filelist, fnTable ||{}, (table, filename) => {
      return extendFnTable(table, null, filename, process.cwd(), reqFailFn);
    });

    if (sys_argv.verbose) { console.log(`Starting build_fnTable: required ${filelist.length}`); }
    return build_fnTable({...sys_argv, fnTable}, callback);
  }

  if (glob) {
    cwd     = cwd || process.cwd();
    const options = {
      ignore    : [...globIgnore, ...(sys_argv.ignore || sys_argv.globIgnore ||[])].map(x => relativify(x, cwd)),
      cwd,
    };

    // console.log(`invoke-glob`, sg.inspect({options, ignore: sys_argv.ignore, sys_argv}));
    if (sys_argv.verbose) { console.log(`Starting build_fnTable: globbing`); }
    return libGlob(glob, options, function(err, filelist) {
      // console.log(`build_fnTable`, sg.inspect({err, filelist}));
      if (sys_argv.verbose) { console.log(`Starting build_fnTable: globbed ${filelist.length}`); }
      return build_fnTable({...sys_argv, filelist}, callback);
    });
  }

  return callback(`ENOFNTABLE`);
}

// ----------------------------------------------------------------------------------------------------------------------------
function run_v2(sys_argv, fnName, argv_, callback, ...rest /* rest is [options, abort]*/) {
  var argv                    = {...argv_};
  var {debug,verbose}         = argv;

  ({debug,verbose,...argv} = argv);

  return build_fnTableSmart({...sys_argv,debug,verbose,fnName}, function(err, fnTable) {
    if (err)  { return callback(err); }
    return invokeIt_v2(fnTable);
  });

  // =====================================================================================
  function invokeIt_v2(fnTable) {

    if (sg.isnt(fnTable)) {
      return callback(`ENOFN`);
    }

    run_v2FromTable(fnTable, fnName, argv, onResult, ...rest /* rest is [options, abort]*/);

    // =====================================================================================
    function onResult(err, data, ...rest) {
      console.log(`run_v2-cb`, sg.inspect({err, ...logSmData({data, rest})}));
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
function invoke_v2(lib, fnName, argv_, callback, options__ ={}, abort =null) {
  const fn = lib[fnName];
  if (!fn)                                { return callback(`ENOFN`); }

  // Load up the function
  var   modjule               = {exports:{}};
  const ra                    = require('../v2/mod-squad');
  const mod                   = ra.modSquad(modjule, 'invoke_v2_root');
  var   init;

  var   argv = sg.argvPod(argv_);

  // Get options
  // const {context, ...options_} = options__;
  const [context0, options_] = sg.reduce(options__, [{},{}], (m,v,k) => {
    if (k === 'context')  { return [v, m[1]]; }                   /* put context into [0] */
    return [m[0], {...m[1], [k]:v}];                              /* Accumulate into [1] */
  });

  // Get args
  const {
    debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human
  }               = argv;
  const options  = sg.merge({...options_, debug, silent, verbose, ddebug, forceSilent, vverbose, machine, human});

  // Will get invoked at the bottom of this function
  const invoke_v2_main = function() {

    // TODO: what does context0 mean? We need to preserve it, for sure.

    // Build up or get the context
    var   context_ = {
      ...context0,
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
function extendFnTable(table, mod, filename, dirname, reqFailFn = extendFnTable_requireFail) {

  if (mod) {
    sg._.each(mod, (value,fnName) => {
      if (typeof value === 'function') {
        // if (value.length !== 3) {
        //   sg.elog(sprintf(`Skipping (Arity %2d) %-29s %s`, value.length, fnName, (''+value).split('\n')[0]));
        // }

        const arity       = value.length;
        const hasAsync    = !!(mod && mod.async && typeof mod.async[fnName] === 'function');
        const score       = scoreRaFnSignature(mod, fnName, value);

        var   entry       = {arity, hasAsync, ...score, fn: value, filename, dirname, fullfilename: path.join(dirname, filename), fnName};
        entry             = {...entry, tier: scoreTier(entry)};

        // sg.elog(sprintf(`Adding %-29s %j %s`, fnName, entry, (''+value).split('\n')[0]));

        table[fnName] = {mod, ...entry};
      } else {
        // sg.elog(`[[so says ${__filename}]]: "${fnName}"  is not a function while loading ${filename}: (it is a ${typeof value})`);
      }
    });

  } else if (filename) {
    const reqPath   = path.join(dirname, filename);
    reqFailFn(null, reqPath);

    const mod_      = safeRequire(reqPath);
    if (!mod_) {
      reqFailFn(reqPath);
    } else {
      return extendFnTable(table, mod_, filename, dirname, reqFailFn);
    }
  }

  return table;
}

// ----------------------------------------------------------------------------------------------------------------------------
function extendFnTable_requireFail(failFilename, reqFilename) {
  if (failFilename) {
    sg.logError(`Cannot require(${failFilename})\n\nuse to see:\n  node ${failFilename}\n----------------\n\n`, 'ENOENT ==>');
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
function scoreRaFnSignature(mod, fnName, fn_) {
  var   fn          = fn_;
  var   arity       = fn.length;
  var   first       = (''+fn).split('\n')[0];         /* First line of function (string) */
  var   params      = first.match(/\(([^)]+)\)/);     /* Parameters to function (regex) */
  var   isAsync     = false;
  var   hasAsync    = !!(mod && mod.async && typeof mod.async[fnName] === 'function');
  var   paramsStr   = '';
// console.log(`first0`, {first:first.substr(0, params && params.index || 0)}, params && params[0]);

  var sub;
  if (params && (sub = first.substr(0, params.index))) {
    if (sub.indexOf('callbackified') !== -1) {
      // We have a function that is async, that was registered mod.async({xyz: async function(...)})
      // We need to look at the real function that the user wrote
      fn = mod.async && mod.async[fnName];

      arity       = fn.length;
      first       = (''+fn).split('\n')[0];         /* First line of function (string) */
      params      = first.match(/\(([^)]+)\)/);     /* Parameters to function (regex) */
      isAsync     = true;
      hasAsync    = !!(mod && typeof mod[fnName] === 'function');
    }
  }
// console.log(`first1`, {first:first.substr(0, params && params.index || 0)}, params && params[0]);
  paramsStr         = (params && params[1]) ||'';     /* Parameters to function (string) */
  params            = paramsStr.split(/,\s*/g);       /* Parameters to function (array<string>) */

  // Are the names to the function right?
  var   names = true;
  if (arity > 0 || params.length > 0) {           names = names &&   (':argv:event:req:'.indexOf(`:${params[0] = cleanParam(params[0])}:`) !== -1); }
  if (arity > 1 || params.length > 1) {           names = names &&      (':context:res:'.indexOf(`:${params[1] = cleanParam(params[1])}:`) !== -1); }

  if (arity === 3 || params.length === 3) {       names = names && (':callback:cb:rest:'.indexOf(`:${params[2] = cleanParam(params[2])}:`) !== -1);
    if (names && params[2] !== 'rest') {
      arity = Math.max(arity, 3);
    }
  } else if (arity === 2) {
    // names is already computed
  }

  // Cannot have names right if not 2 or 3 arity
  if (arity < 2 || arity > 3) {
    names = false;
  }

  var result = {};

  // However, if you have the perfect signature, youre good

  // (argv, context, callback)
  // (argv, context, callback_)
  // (argv_, context__, callback____)

  if (fn.length === 3) {
    // /argv(_*)\s*,/ is: 'argv' followed by zero or more underscores, any whitespace, and a comma.
    if ((paramsStr.match(/argv(_*)\s*,\s*context(_*)\s*,\s*callback(_*)/i))) {
      result.tier   = 1;
      result.names  = true;
    }
  } else if (fn.length === 2) {
    if ((paramsStr.match(/argv(_*)\s*,\s*context(_*)/i))) {
      result.tier   = 1;
      result.names  = true;
    }
  }

  result = {...result, arity, fnLen: fn.length, names, hasAsync, isAsync, paramsStr, first};
// console.log(`first2`, {result});

  return result;
}

// ----------------------------------------------------------------------------------------------------------------------------
function scoreTier(entry) {

  if (!sg.isnt(entry.tier))           { return entry.tier; }

  // Tier1
  if (entry.hasAsync && entry.names) {
    return 1;
  }

  // Tier2
  if (entry.hasAsync) {
    return 2;
  }

  // Tier3
  else if (entry.names) {
    return 3;
  }

  // Tier4
  return 4;
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

  if (item.fullfilename) {
    return safeRequire(item.fullfilename);
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

// ----------------------------------------------------------------------------------------------------------------------------
function relativify(filename, dir) {
  if (path.isAbsolute(filename)) {
    return path.relative(dir, filename);
  }
  return filename;
}


