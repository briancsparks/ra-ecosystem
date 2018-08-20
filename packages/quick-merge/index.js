
/**
 *
 */
const sg                      = require('sgsg');
const _                       = sg._;

const ARGV                    = sg.ARGV();
const argvGet                 = sg.argvGet;
const argvExtract             = sg.argvExtract;
const setOnn                  = sg.setOnn;
const deref                   = sg.deref;

var lib = {};

const main = function(callback) {

  var result = {};
  return sg.iwrap('fn', callback, abort, function(eabort) {

    return sg.__run3([function(next, enext, enag, ewarn) {
      return next();

    }, function(next, enext, enag, ewarn) {
      return next();

    }], function() {

      result.qmerge = 42;
      return callback(null, result);
    });
  });

  function abort(err, msg) {
    console.error(msg, err);
    return callback(err);
  }
};


//...
lib.myFavoriteFunction = function(argv, context, callback) {
  return callback();
};




_.each(lib, (value, key) => {
  exports[key] = value;
});

if (sg.callMain(ARGV, __filename)) {
  return main(function(err, result) {
    if (err)      { console.error(err); return process.exit(2); }
    if (result)   { console.log(result); }
  });
}

