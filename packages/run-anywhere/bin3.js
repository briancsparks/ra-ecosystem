
const sg                      = require('sg-argv');
const path                    = require('path');
const libInvoke               = require('./lib/v3/invoke');
const libGlob                 = require('glob');

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

    // Make 'ra3 checkRequires' -- to walk through a package and require everything, hoping not to get the 'cannot require' message
    if (!fn) {
      if (fnName === 'test-require-all') {
        let mod = safeRequire(__dirname, './lib/v3/bin/test-require-all');
        if (!mod) {
          return callback(`ENOINVOKE`);
        }

        fn = mod.main;
      }
    }

    // Make 'ra3 list-fns' -- to walk through a package and require everything, hoping not to get the 'cannot require' message
    if (!fn) {
      if (fnName === 'list-fns') {
        let mod = safeRequire(__dirname, './lib/v3/bin/list-fns');
        if (!mod) {
          return callback(`ENOINVOKE`);
        }

        fn = mod.main;
      }

      if (fnName.toLowerCase().startsWith('list-fns-')) {
        let mod = safeRequire(__dirname, './lib/v3/bin/list-fns');
        if (!mod) {
          return callback(`ENOINVOKE`);
        }

        // Put the fnName back as the command
        commands.unshift(fnName);

        fn = function(argv, ...rest) {
          var extras = {};
          if (fnName === 'list-fns-json')         { extras.asJson = true; }
          if (fnName === 'list-fns-save-json')    { extras.saveJson = true; }

          return mod.main({...argv, ...extras}, ...rest);
        };
      }
    }

    // If we cannot find a function, the user gets 'invoke'
    if (!fn) {
      sg.elog(`Warn: auto loading 'invoke' from bin3. Is this what you want? (For function: ${fnName})`);

      // Put the fnName back as the command
      commands.unshift(fnName);

      return find('invoke', callback);
    }

    return callback(null, fn);
  }
}


// console.log(ARGV);

// Do not be too eager if we are just being required
if (require.main === module) {
  main(ARGV);
}
