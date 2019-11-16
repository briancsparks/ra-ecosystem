
const sg                      = require('sg-argv');
const libInvoke               = require('./lib/v3/invoke');
const libGlob                 = require('glob');

const ARGV                    = sg.ARGV();

const {run_v2,extendFnTable}  = libInvoke;

module.exports.main = main;

function main(argv_) {
  var {
    fnName,
    fnTable,
    filelist,
    ...argv
  }               = argv_;
  var commands                = argv_._;

  fnName = fnName || commands.shift();

  var source      = sg.merge({filelist,fnTable});

  run_v2(source, fnName, argv, function(err, data, ...rest) {
    // console.log(`invokeit-cb`, sg.inspect({fns, fnName, argv, err, data, rest}));
    console.log(`invokeit-cb`, sg.inspect({err, data, rest}));
  });
}

function main2(argv_) {
  var filelist = [], glob;
  var {fns, fnName, ...argv}  = argv_;
  var commands                = argv_._;

  fnName = fnName || commands.shift();

  if (sg.isnt(fns)) {
    ({filelist, ...argv} = argv);
    if (filelist) {
      fns = sg.reduce(filelist, fns ||{}, (table, filename) => {
        return extendFnTable(table, null, filename, process.cwd());
      });

      return invokeIt();
    }
  }

  if (sg.isnt(fns)) {
    ({glob, ...argv} = argv);
    if (glob) {
      // TODO: ...
      libGlob(glob, function(err, files) {
console.log(`globbed ${glob}`, {err, files});

      });
    }
  }

  function invokeIt() {
    run_v2(fns, fnName, argv, function(err, data, ...rest) {
      // console.log(`invokeit-cb2`, sg.inspect({fns, fnName, argv, err, data, rest}));
      console.log(`invokeit-cb`, sg.inspect({err, data, rest}));
    });
  }
}

// console.log(ARGV);

main(ARGV);
