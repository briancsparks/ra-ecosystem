if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg-argv');
const { _ }                   = sg;
// const qm                      = require('quick-merge');
const execa                   = require('execa');
// const getStream               = require('get-stream');

var   lib                     = {};
const curl                    = addToLib(require('./lib/curl'));
const execz                   = addToLib(require('./lib/execz'));

const ARGV                    = sg.ARGV();

// -------------------------------------------------------------------------------------
// exports
//

exports.execa = execa;
// exports.execz = execz;

// -------------------------------------------------------------------------------------
//  Helper Functions
//

// function execz(...args_) {
//   var   args      = _.toArray(args_);

//   const next      = args.pop() || function(){};
//   var   options   = (sg.isObject(args[0]) ? args.shift() : {});

//   return _execz_(sg.merge(options, {next}), args);
// }

// function _execz_({next,show=true}, args /*file, command, rest*/) {
//   const cmdline                   = qm.stitch(args);
//   const [file, command, ...rest]  = cmdline;
//   const cliArgs                   = _.compact([command, ...rest]);

//   ARGV.v(`execz`, {file, command, rest, show, next: (next === noop ? 'noop' : next) || 'function'});

//   const stdout = execa(file, cliArgs).stdout;

//   if (show && !ARGV.quiet) {
//     stdout.pipe(process.stdout);
//   }

//   getStream(stdout).then(content => {
//     ARGV.v(`-------------------------------------------------------\n  execz exit, ${sg.splitLn(content).length} lines`);
//     return (next || function(){})();
//   });
// }

// function noop(){}

function addToLib(mod) {
  _.each(mod, (v,k) => {
    exports[k] = v;
  });

  return mod;
}
