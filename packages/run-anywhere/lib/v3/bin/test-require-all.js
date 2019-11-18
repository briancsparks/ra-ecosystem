// console.log(`required`, __filename);

const sg                      = require('sg-argv');
const {_}                     = sg;
const path                    = require('path');
const {sprintf}               = require('sprintf-js');
const {
  extractSysArgv,
  crackInvokeArgs,
  cleanTable,
}                             = require('./utils');
const libInvoke               = require('../invoke');
const {build_fnTable}         = libInvoke;


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

  var params      = {reqFailFn};

  return build_fnTable({...sys_argv, ...params}, function(err, fnTable) {
    console.log(`\ntest-require-all-cb ${err && __filename+'\n'}`, sg.inspect({err, fnTable: cleanTable(fnTable, 1)}));
  });

  function reqFailFn(failFilename, reqFilename) {
    if (failFilename) {
      console.log(`Cannot require(${failFilename})\n\nuse to see:\n  node ${failFilename}\n----------------\n`);
      try {
        require(failFilename);
      } catch (err) {
        console.log(err, `\n----------------\n\n`);
      }
    }

    if (reqFilename) {
      console.log(`require(${reqFilename})`);
    }
  }}

//-----------------------------------------------------------------------------------------------------------------------------
function cleanTableX(fnTable) {
  var   result  = {};
  var   tier2   = {};
  var   tier3   = {};
  var   tier4   = {};

  result.tier1 = sg.reduceObj(fnTable, {}, (m,v,k) => {
    const value = {...v, mod: !!v.mod, fn: !!v.fn};

    // Tier1
    if (v.hasAsync && v.names) {
      return [value];
    }

    // Tier2
    if (v.hasAsync) {
      tier2 = {...tier2, [k]:value};
    }

    // Tier3
    else if (v.names) {
      tier3 = {...tier3, [k]:value};
    }

    // Tier4
    else {
      tier4 = {...tier4, [k]:value};
    }
  });

  result = {...result, tier2, tier3, tier4};

  result.tier4 = sg.numKeys(result.tier4);
  result.tier3 = sg.numKeys(result.tier3);
  result.tier2 = sg.numKeys(result.tier2);
  result.tier1 = sg.numKeys(result.tier1);

  return result;
}

