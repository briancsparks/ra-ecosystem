// console.log(`required`, __filename);

const sg                      = require('sg-argv');
const {_}                     = sg;
const path                    = require('path');
const fs                      = require('fs');
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
  if (sg.isnt(argv_))                       { return exports.main(sg.ARGVplain() ||{}); }

  const glob_             = '**/*.js';
  const globIgnore_       = [
    __filename
  ];

  const [argv__,asJson,saveJson] = sg.reduce(argv_, [{},null,null], (m,v,k) => {
    if (k in {asJson:true}) {
      return [m[0], v, m[2]];
    } else if (k in {saveJson:true}) {
      return [m[0], m[1], v];
    }
    return [{...m[0], [k]:v}, m[1], m[2]];
  });

  const {fnName,ignore,globIgnore,user_sys_argv,argv,sys_argv,commands}
        = crackInvokeArgs(argv__, {...user_sys_argv_, glob: glob_, globIgnore: globIgnore_});

  const cwd       = argv.cwd || process.cwd();

  var params      = {};
  params.reqFailFn = function(failFilename, reqFilename) {
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
  };

  return build_fnTable({...sys_argv, ...params}, function(err, fnTable_) {
    const fnTable = cleanTable(fnTable_);

    if (asJson) {
      console.log(cleanTableJson(fnTable_));
    } else if (saveJson) {
      const json      = cleanTableJson(fnTable_);
      const str       = sg.safeJSONStringify(json);
      const filename  = path.join(cwd, `run-anywhere-fntable.json`);
console.log(`asdfasave1`, {filename, len:str.length, num:str.split('\n').length});

      const result = fs.writeFileSync(filename, str);
      // console.log(`asdfasave3`, {filename, len:str.length, num:str.split('\n').length, err, result});
    } else {
      _.each([fnTable.tier4,fnTable.tier3,fnTable.tier2,fnTable.tier1], tier => {
        _.each(tier, item => {
          // console.log(sprintf("%2d %2d %33s %-22s %-22s %s", item.tier, item.arity, item.fnName, '('+item.paramsStr+')', '('+item.first+')', item.filename));
          console.log(sprintf("%2d %2d (%d) %s %6s %s %33s %-40s %-22s %s",
                  item.tier, item.arity, item.fnLen,
                  (item.arity !== item.fnLen)   ? '!' : ' ',
                  item.hasAsync,
                  item.isAsync                  ? '!' : ' ',
                  item.fnName,
                  '('+item.paramsStr+')',
                  " " || '('+item.first+')',
                  item.filename));
        });
      });
    }
    // console.log(`\nlist-fns-cb ${err && __filename+'\n'}`, sg.inspect({err, fnTable: cleanTable(fnTable_)}));
  });
}

//-----------------------------------------------------------------------------------------------------------------------------
function cleanTableJson(fnTable) {
  return sg.reduceObj(fnTable, {}, (m,v,k) => {
    const {mod,fn,...value} = v;
    return [value];
  });
}

