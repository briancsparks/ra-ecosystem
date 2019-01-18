

// -------------------------------------------------------------------------------------
//  requirements
//

const _                       = require('lodash');
const utilLib                 = require('util');

const promisify               = utilLib.promisify;
const callbackify             = utilLib.callbackify;

// -------------------------------------------------------------------------------------
//  Data
//

// -------------------------------------------------------------------------------------
//  Functions
//

const ModSquad = function(otherModule) {
  var   self      = this;

  self.utils      = {_, ...utilLib};

  otherModule.exports.async = otherModule.exports.async || {};

  self.xport = function(fobj) {
    var previousFn;

    _.each(fobj, (fn_,k) => {
      var fn = fn_;

      // TODO: wrap `fn` in a safety function that scrubs debug info out of the result
      if (fn) {
        fn = function(argv, context, callback_) {
          const callback = function(err, data, ...rest) {

            if (err) {
              let { code, errno } = err;
              console.error(`Found error: `, {code, errno});
            }

            return callback_(err, data, ...rest);
          };

          return fn_(argv, context, callback);
        };
      }

      otherModule.exports[k]        = previousFn = (fn || previousFn);
      otherModule.exports.async[k]  = promisify(fn || previousFn);
    });

    return previousFn;
  };

  self.async = function(fobj) {
    var previousFn;

    _.each(fobj, (fn,k) => {
      otherModule.exports.async[k]  = previousFn = (fn || previousFn);
      otherModule.exports[k]        = callbackify(fn || previousFn);
    });

    return previousFn;
  };

};

module.exports.modSquad = function(...args) {
  return new ModSquad(...args);
};

// -------------------------------------------------------------------------------------
//  Helper functions
//


