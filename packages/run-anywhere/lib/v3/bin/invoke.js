// console.log(`required`, __filename);

const sg                      = require('sg-argv');
const path                    = require('path');
const {
  extractSysArgv,
  crackInvokeArgs,
}                             = require('./utils');
const libInvoke               = require('../invoke');
const {run_v2}                = libInvoke;


module.exports.runners = {};
module.exports.runners.invoke   = main;
module.exports.main             = main;


// ============================================================================================================================
function main(argv_, user_sys_argv_ ={}) {
  if (sg.isnt(argv_))                       { return main(sg.ARGV() ||{}); }

  const glob_             = '**/*.js';
  const globIgnore_       = [
    __filename
  ];

  const {fnName,ignore,globIgnore,user_sys_argv,argv,sys_argv,commands}
        = crackInvokeArgs(argv_, {...user_sys_argv_, glob: glob_, globIgnore: globIgnore_});

  run_v2(sys_argv, fnName, argv, function(err, data, ...rest) {
    console.log(`bin/invokeit-cb ${err && __filename+'\n'}`, sg.inspect({err, data, rest}));
  });
}

