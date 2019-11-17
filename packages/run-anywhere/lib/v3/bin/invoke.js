// console.log(`required`, __filename);

const sg                      = require('sg-argv');
const path                    = require('path');
const {extractSysArgv}        = require('./utils');
const libInvoke               = require('../invoke');
const {run_v2}                = libInvoke;


module.exports.runners = {};
module.exports.runners.invoke   = main;
module.exports.main             = main;


// ============================================================================================================================
function main(argv_, user_sys_argv_ ={}) {
  if (sg.isnt(argv_))     { return main(sg.ARGV() ||{}); }

  var {
    // sys_argv:
    fnName,
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

  // ---
  ignore          = [__filename, ...sg.arrayify(globIgnore || ignore)];

  sys_argv    = sg.merge({ignore, ...sys_argv, ...user_sys_argv});
  run_v2(sys_argv, fnName, argv, function(err, data, ...rest) {
    console.log(`bin/invokeit-cb ${err && __filename+'\n'}`, sg.inspect({err, data, rest}));
  });
}

