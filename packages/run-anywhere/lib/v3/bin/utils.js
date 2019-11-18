
const sg                      = require('sg0');


module.exports.crackInvokeArgs      = crackInvokeArgs;
module.exports.extractSysArgv       = extractSysArgv;
module.exports.extractSysArgvNamed  = extractSysArgvNamed;
module.exports.cleanTable           = cleanTable;

// ----------------------------------------------------------------------------------------------------------------------------
function crackInvokeArgs(argv_, user_sys_argv_ ={}) {
  if (sg.isnt(argv_))     { return crackInvokeArgs(sg.ARGV() ||{}); }

  var {
    // sys_argv:
    fnName,
    command,
    ignore, globIgnore,
    // fnTable, filelist, glob,

    user_sys_argv,
    argv,
    ...sys_argv
  }               = extractSysArgv({argv: argv_}, {user_sys_argv: user_sys_argv_});

  var commands    = argv_._;

  // ---
  fnName          = fnName || commands.shift();
  command         = fnName;

  // ---
  globIgnore      = ignore = [...sg.arrayify(globIgnore || ignore)];

  sys_argv        = sg.merge({...sys_argv, ...user_sys_argv, ignore, globIgnore, fnName, commands, command});

  return sg.merge({fnName,ignore,globIgnore,user_sys_argv,argv,sys_argv,commands,command});
}

// ----------------------------------------------------------------------------------------------------------------------------
function extractSysArgvNamed(from, ...others) {
  var   [sys_argv, keyedValues] = extractSysArgv_(from, ...others);
  return [sys_argv.sys_argv, keyedValues];
}

// ----------------------------------------------------------------------------------------------------------------------------
function extractSysArgv(from, ...others) {
  var   [sys_argv, keyedValues] = extractSysArgvNamed(from, ...others);
  return sg.merge(sys_argv, keyedValues);
}

// ----------------------------------------------------------------------------------------------------------------------------
function extractSysArgv_(from, ...others_) {
  var   rest;
  var   [key, value]  = sg.firstKv(from);
  var   othersX       = others_.length > 0 ? others_ : [{}];
  var   sys_argv      = {};
  var   values        = [from, ...others_];

  var resultValues = [];
  while (values.length > 0) {
    [sys_argv, rest] = extractOneSysArgv(values.shift(), sys_argv);
    resultValues = [...resultValues, rest];
  }

  return [{sys_argv}, ...resultValues];
}

// ----------------------------------------------------------------------------------------------------------------------------
function extractOneSysArgv(from, seed = {}) {
  var   [key, value]  = sg.firstKv(from);
  var   { fnTable, filelist, glob, ignore, globIgnore, ...rest }  = value;
  const sys_argv = sg.merge({ fnTable, filelist, glob, ignore, globIgnore, ...seed });

  return [sys_argv, {[key]:rest}];
}

// ----------------------------------------------------------------------------------------------------------------------------
function extractOne(keys_, from, seed = {}) {
  var   keys          = sg.keyMirrorR(Array.isArray(keys_) ? keys_ : (typeof keys_ === 'string') ? keys.split(',') : Object.keys(keys_));
  var   [key, value]  = sg.firstKv(from);
  var   rest          = {};

  var   result = sg.reduceObj(value, {}, function(m,v,k) {
    if (k in keys) {
      // Should be extracted
      return true;
    }
    rest[k] = value;
    return false;
  });

  return [result, {[key]:rest}];
}

//-----------------------------------------------------------------------------------------------------------------------------
function cleanTable(fnTable, squashLevel =9) {
  var   result  = {};
  var   tier2   = {};
  var   tier3   = {};
  var   tier4   = {};

  result.tier1 = sg.reduceObj(fnTable, {}, (m,v,k) => {
    var value = {...v, mod: !!v.mod, fn: !!v.fn};

    // Tier1
    if (v.tier === 1) {
      return [value];
    }

    // Tier2
    if (v.tier === 2) {
      tier2 = {...tier2, [k]:value};
    }

    // Tier3
    else if (v.tier === 3) {
      tier3 = {...tier3, [k]:value};
    }

    // Tier4
    else {
      tier4 = {...tier4, [k]:value};
    }
  });

  result = {...result, tier2, tier3, tier4};

  if (squashLevel <= 1)        { result.tier1 = {numKeys: sg.numKeys(result.tier1)}; }
  if (squashLevel <= 2)        { result.tier2 = {numKeys: sg.numKeys(result.tier2)}; }
  if (squashLevel <= 3)        { result.tier3 = {numKeys: sg.numKeys(result.tier3)}; }
  if (squashLevel <= 4)        { result.tier4 = {numKeys: sg.numKeys(result.tier4)}; }

  return result;
}

