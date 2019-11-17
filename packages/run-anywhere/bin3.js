
const sg                      = require('sg-argv');
const path                    = require('path');
const libInvoke               = require('./lib/v3/invoke');
const libGlob                 = require('glob');

const ARGV                    = sg.ARGV();

const {safeRequire}           = libInvoke;

module.exports.main = main;

// TODO: use loud rejection and pipe-break

function main(argv_) {
  var fnName;
  var argv                    = {...argv_};
  var commands                = argv_._;

  fnName = fnName || commands.shift();

  return find(fnName, function(err, fn) {
    if (err || !fn)                               { sg.logError(err || `ENOFINDFN`, fnName); return; }

    const globIgnore = [__filename];

    // Invoke it ------ !
    return fn({...argv}, {globIgnore});
  });

  // ==========================================================================================================================
  function find(fnName, callback) {
    var fn;

    if (!fn) {
      if (fnName === 'invoke') {
        let mod = safeRequire(__dirname, './lib/v3/bin/invoke');
        if (!mod) {
          return callback(`ENOINVOKE`);
        }

        fn = mod.main;
      }
    }

    // TODO: Use this to make 'ra3 checkRequires' -- to walk through a package and require everything, hoping not to get the 'cannot require' message
    if (!fn) {
      if (fnName === 'test-require-all') {
        let mod = safeRequire(__dirname, './lib/v3/bin/test-require-all');
        if (!mod) {
          return callback(`ENOINVOKE`);
        }

        fn = mod.main;
      }
    }

    // If we cannot find a function, the user gets 'invoke'
    if (!fn) {
      // Put the fnName back as the command
      commands.unshift(fnName);

      return find('invoke', callback);
    }

    return callback(null, fn);
  }
}


// console.log(ARGV);

main(ARGV);
