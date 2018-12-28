
// -------------------------------------------------------------------------------------
//  requirements
//
const _                       = require('lodash');
const path                    = require('path');
const sh                      = require('shelljs');

// -------------------------------------------------------------------------------------
//  Data
//

const sanityCheck             = 'sanityCheck';
var   root                    = sh.exec(`git rev-parse --show-toplevel`, {silent:true}).stdout.split('\n')[0];

// -------------------------------------------------------------------------------------
//  Functions
//

exports.registerSanityChecks = function(otherMod, filename, sanityChecks) {

  otherMod.exports.sanityChecks = sanityChecks;

  const runSanityChecks = otherMod.exports.runSanityChecks = function(context, callback_) {
    const callback  = callback_ || function(){};
    const assert    = require('assert');
    var   errors    = [];
    var   count     = 0;

    const next = _.after(sanityChecks.length, function() {
      console.log(`File: ${filename}: Pass: ${count}, Fail: ${errors.length}`);

      if (errors.length > 0) {
        errors.forEach(err => {
          const stack = err.stack || (err.err || {}).stack || (err.error || {}).stack;
          console.error(err);
          if (stack) {
            console.error(stack);
          }
        });
        debugger;
      }

      return callback(null, {pass: count, fail: errors.length});
    });

    sanityChecks.forEach(async (check) => {
      try {
        const names = ''+ await check({assert, ...context});
        count += 1;

        _.each(names.split(','), name => {
          console.log(`Pass: ${name}`);
        });

      } catch(error) {
        // console.error(error.message);
        // console.error(error.stack);
        errors.push(error);
      }
      next();
    });
  };

  const sanityCheck = 'sanityCheck';
  if (process.argv[1] === filename) {
    require('loud-rejection/register');
    runSanityChecks({sanityCheck});
  }
};

exports.runSanityChecksFor = function(files_) {
  require('loud-rejection/register');

  var numPass = 0;
  var numFail = 0;

  const files = files_ || defFiles();

  const next = _.after(files.length, done);

  files.forEach(file => {
    // console.log(file);
    const mod = require(path.join(root, file));
    if (mod.runSanityChecks) {
      return mod.runSanityChecks({sanityCheck}, function(err, {pass, fail}) {
        numPass += pass;
        numFail += fail;

        return next();
      });
    } else {
      console.log(`No sanity checks for ${file}`);
    }

    return next();
  });

  function done() {
    console.log(`\nTotal pass: ${numPass}; Total fail: ${numFail}`);
  }
};

// -------------------------------------------------------------------------------------
//  Helper functions
//

function defFiles() {
  var   files = sh.exec(`git ls-files`, {silent:true}).stdout.split('\n');

  files = files.filter(file => file.endsWith('.js'));
  files = files.filter(file => !file.endsWith('.test.js'));
  // files = files.filter(file => file.startsWith('src/'));

  // files = files.filter(file => file.indexOf('/lambda') === -1);
  // files = files.filter(file => file.indexOf('src/utils') === -1);
  // files = files.filter(file => file.indexOf('src/app/app.js') === -1);
  // files = files.filter(file => file.indexOf('src/app/host.js') === -1);

  // files = files.filter(file => file.indexOf('src/lib/client-start.js') === -1);
  // files = files.filter(file => file.indexOf('src/lib/ingest.js') === -1);

  // files = [
  //   'src/lib/client-start.js',
  //   'src/lib/ingest.js',
  //   ...files
  // ];

  return files;
}
