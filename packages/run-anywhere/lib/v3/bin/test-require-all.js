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
function main(argv_, user_sys_argv_ ={}, callback) {
  if (sg.isnt(argv_))                       { return main(sg.ARGV() ||{}); }

  var numTests = 0;
  var numFails = 0;

  const glob_             = '**/*.js';
  const globIgnore_       = [
    __filename
  ];

  const {fnName,ignore,globIgnore,user_sys_argv,argv,sys_argv,commands}
        = crackInvokeArgs(argv_, {...user_sys_argv_, glob: glob_, globIgnore: globIgnore_});

  process.env.RA_TEST_REQUIRE_ALL         = 1;
  process.env.RUN_SIDE_EFFECT_FREE_TESTS  = 1;

  var params      = {reqFailFn: requireFailedFn};

  return build_fnTable({...sys_argv, ...params}, function(err, fnTable) {
    console.log(`\ntest-require-all-cb ${err && __filename+'\n'}`, sg.inspect({err, fnTable: cleanTable(fnTable, 1)}));
    if (callback) { return callback(err, {ok:(numFails === 0), numTests, numFails, }); }
  });

  function requireFailedFn(failFilename, reqFilename) {

    if (failFilename) {
      numFails += 1;
      console.log(`Cannot require(${failFilename})\n\nuse to see:\n  node ${failFilename}\n----------------\n`);
      try {
        require(failFilename);
      } catch (err) {
        console.log(err, `\n----------------\n\n`);
      }
    }

    if (reqFilename) {
      numTests += 1;
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

