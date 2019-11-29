
const sg                      = require('sg-argv');
const path                    = require('path');
const libInvoke               = require('./lib/v3/invoke');
const libGlob                 = require('glob');
const {origCliArgs}           = sg;

const ARGV                    = sg.ARGV();

const {safeRequire}           = libInvoke;

module.exports.main = main;


function main(argv_) {
  require('loud-rejection/register');
  require('exit-on-epipe');

  var fnName;
  var argv                    = {...argv_};
  var commands                = argv_._;

  fnName = fnName || commands.shift();

  return find(fnName, function(err, fn) {
    if (err || !fn)                               { sg.logError(err || `ENOFINDFN`, fnName); return; }

    const globIgnore = [__filename];

    // Invoke it ------ !
    return fn({...argv}, {globIgnore}, function(err, data) {
      console.log(`node ${__filename} ${origCliArgs(argv_)}`);
      console.log(`binfilemain`, {err, data});
    });
  });




  // ==========================================================================================================================
  function find(fnName, callback) {
    var fn;

    // Do one file?
    if (fnName === 'one-file') {
      let filename  = argv._ && argv._[0];
      let mod       = safeRequire(filename);

      if (mod && mod.ra_active_fn_name) {
        fn = mod[mod.ra_active_fn_name];
        if (!fn) {
          console.error(`ENOFN: The fn ${mod.ra_active_fn_name} was not found in ${filename}.`, {argv});
          return callback(`ENOINVOKE`);
        }

        // return callback(null, fn);
      }
    }

    return callback(null, fn);
  }
}


// console.log(ARGV);

// Do not be too eager if we are just being required
if (require.main === module) {
  main(ARGV);
}
