

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

const ModSquad = function(otherModule, otherModuleName = 'mod') {
  var   self      = this;

  self.utils      = {_, ...utilLib};

  otherModule.exports.async = otherModule.exports.async || {};

  self.xport = function(fobj) {
    var previousFn;

    _.each(fobj, (fn_, fname) => {
      var fn            = fn_;
      const fullFname   = `${otherModuleName}__${fname}`;

      // TODO: wrap `fn` in a safety function that scrubs debug info out of the result
      if (fn) {

        // This is the function that will be exported. ----------------------------------------
        fn = function(argv, context, callback_) {

          context.runAnywhere             = context.runAnywhere             || {};
          context.runAnywhere[fullFname]  = context.runAnywhere[fullFname]  || {};

          const callback = function(err, data, ...rest) {

            if (err && ('errno' in err && 'code' in err)) {
              let { code, errno } = err;
              console.error(`Found error: `, {code, errno});
            }

            return callback_(err, data, ...rest);
          };

          context.runAnywhere[fullFname].fra  = context.runAnywhere[fullFname].fra  || new FuncRa(argv, context, callback, callback_);
          context.runAnywhere.fra             = context.runAnywhere.fra             || new FuncRa(argv, context, callback, callback_)

          return fn_(argv, context, callback);
        };
        // ----------------------------------------
      }

      otherModule.exports[fname]        = previousFn = (fn || previousFn);
      otherModule.exports.async[fname]  = promisify(fn || previousFn);
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

module.exports.loads = function(mod, fnames, context, options1, abort) {
  // const loadedFn =  mod[fname];

  return sg.reduce(fnames.split(','), {}, function(m, fname) {

    // ------------------------ The fn that gets called by you
    const interceptFn = function(argv, options__, continuation) {
      const options_  = options__ === true ? {debug:true} : (options__ === false ? {debug:false} : options__);
      var   options   = _.extend({}, options_, options1);

      options.abort   = ('abort' in options ? options.abort : true);

      const callback = function(err, data, ...rest) {
        var   ok = false;
        if (arguments.length === 0)     { ok = true; }
        if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }

        if (options.abort) {
          if (!ok)                      { return abort(err); }
        }

        if (options.debug) {
          console.log(`mod::${fname}()`, sg.inspect({argv, err, data, ...rest}));
        }

        return continuation(err, data, ...rest);
      };

      abort.calling(`${fname}()`, argv);
      return mod[fname](argv, context, callback);
    };
    // ----------------------------- end

    return sg.kv(m, fname, interceptFn);
  });
};

const FuncRa = function(argv, context, callback, origCallback) {
  const self = this;

  self.fname            = null;
  self.providedAbort    = null;
  self.argTypes         = {};
  self.args             = [];
  self.argErrs          = null;

  self.iwrap = function(fname, b, c /* abort, body_callback*/) {
    self.fname = fname;
    // console.log(`fra.iwrapping ${self.fname}`);

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
    const def       = options.def;

    var   defName;
    for (var i = 0; i < names.length; ++i) {
      const name = names[i];

      if (i === 0) {
        defName = name;
        self.argTypes[name] = {name, names, options};
      }

      if (name in argv)                         { return recordArg(argv[name]); }

      if (sg.isUpperCase(name[0]) && name.length > 1) {
        if (sg.toLowerWord(name) in argv)       { return recordArg(argv[sg.toLowerWord(name)]); }
      }
    }

    // If we get here, we did not find it.
    if (required) {
      self.argErrs = sg.ap(self.argErrs, {code: 'ENOARG', ...self.argTypes[defName]});
    }

    return recordArg(def);

    function recordArg(value) {
      if (!sg.isnt(value)) {
        self.args.push({names, options, value});
      }

      return value;
    }
  };

  self.argErrors = function(args = {}) {
    _.each(args, function(value, name) {
      if (sg.isnt(value)) {
        self.argErrs = sg.ap(self.argErrs, {code: 'ENOARG', ...self.argTypes[name]});
      }
    });

    // console.log(`fra.argErrors ${self.fname} (${(self.argErrs || []).length})`);
    return self.argErrs;
  };

  self.abort = function(...abortArgs) {
    const { fname, argTypes, args } = self;

    console.error(`FuncRa aborting`, sg.inspect({fname, argTypes, args}));
    self.providedAbort(self.argErrs[0], 'missing arg');
  };

};

// -------------------------------------------------------------------------------------
//  Helper functions
//


