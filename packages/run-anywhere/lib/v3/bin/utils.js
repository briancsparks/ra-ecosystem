
const sg                      = require('sg0');


module.exports.crackInvokeArgs      = crackInvokeArgs;
module.exports.extractSysArgv       = extractSysArgv;
module.exports.extractSysArgvNamed  = extractSysArgvNamed;

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

  // sg.warn_if(sg.firstKey(others), `ENOTCLEAN`, {others});

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

