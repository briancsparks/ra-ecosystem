

// -------------------------------------------------------------------------------------
//  requirements
//

const sg                      = require('sg-flow');
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

        // This is the function that will be exported. ----------------------------------------
        fn = function(argv, context, callback_) {

          context.runAnywhere       = context.runAnywhere     || {};

          const callback = function(err, data, ...rest) {

            if (err && ('errno' in err && 'code' in err)) {
              let { code, errno } = err;
              console.error(`Found error: `, {code, errno});
            }

            return callback_(err, data, ...rest);
          };

          context.runAnywhere.fra   = context.runAnywhere.fra || new FuncRa(argv, context, callback, callback_);

          return fn_(argv, context, callback);
        };
        // ----------------------------------------
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

// TODO: also need loadAsync
module.exports.load = function(mod, fname) {
  return mod[fname];
};

const FuncRa = function(argv, context, callback, origCallback) {
  const self = this;

  self.providedAbort    = null;
  self.argErrs          = null;

  self.iwrap = function(fname, b, c /* abort, body_callback*/) {

    var body_callback;
    if (arguments.length === 2) {
      body_callback = b;
    } else {
      body_callback = c;
    }

    const my_body_callback = function(abort, ...rest) {

      // Remember the abort function that is given
      self.providedAbort = abort;

      return body_callback(abort, ...rest);
    };

    if (arguments.length === 2) {
      return sg.iwrap(fname, callback, my_body_callback);
    } else {
      return sg.iwrap(fname, callback, b, my_body_callback);
    }
  };

  /**
   * Returns argv[one of the names].
   *
   * @param {*} argv
   * @param {*} names_
   * @param {*} [options={}]
   * @returns
   */
  self.arg = function(argv, names_, options = {}) {
    const names     = names_.split(',');
    const required  = options.required || false;

    for (var i = 0; i < names.length; ++i) {
      const name = names[i];

      if (name in argv)                         { return argv[name]; }

      if (sg.isUpperCase(name[0]) && name.length > 1) {
        if (sg.toLowerWord(name) in argv)       { return argv[sg.toLowerWord(name)]; }
      }
    }

    // If we get here, we did not find it.
    if (required) {
      self.argErrs = sg.ap(self.argErrs, {code: 'ENOARG', name: names[0], names: names_});
    }

    return;
  };

  self.argErrors = function() {
    return self.argErrs;
  };

  self.abort = function(...args) {
    // console.error(`FuncRa aborting`, self);
    self.providedAbort(self.argErrs[0], 'missing arg');
  };

};

// -------------------------------------------------------------------------------------
//  Helper functions
//


