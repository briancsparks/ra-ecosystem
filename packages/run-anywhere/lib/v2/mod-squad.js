

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

  otherModule.exports.modname   = otherModuleName;
  otherModule.exports.async     = otherModule.exports.async || {};

  self.xport = function(fobj) {
    var previousFn;

    _.each(fobj, (fn_, fname) => {
      var fn            = fn_;
      const fullFname   = `${otherModuleName}__${fname}`;

      // Wrap `fn` in a safety function that scrubs debug info out of the result
      if (fn) {

        // This is the function that will be exported and called by those that require() the mod. ----------------------------------------
        fn = function(argv, context, callback_) {

          context.runAnywhere             = context.runAnywhere             || {};
          context.runAnywhere[fullFname]  = context.runAnywhere[fullFname]  || {};

          // This will be called when the called function finishes. -----
          const callback = function(err, data, ...rest) {

            if (err && ('errno' in err && 'code' in err)) {
              let { code, errno } = err;
              console.error(`Found error: `, {code, errno});
            }

            return callback_(err, data, ...rest);
          };
          // -----

          // Attach a special run-anywhere object to the context.
          context.runAnywhere[fullFname].fra  = context.runAnywhere[fullFname].fra  || new FuncRa(argv, context, callback, callback_, {otherModule: otherModule.exports, otherModuleName, fname});
          context.runAnywhere.fra             = context.runAnywhere.fra             || new FuncRa(argv, context, callback, callback_, {otherModule: otherModule.exports, otherModuleName})

          // Call the modules function (the original function.)
          return fn_(argv, context, callback);
        };
        // ----------------------------------------
      }

      // Export the modules function (the original function.)
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
          console.error(`mod::${fname}()`, sg.inspect({argv, err, data, ...rest}));
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

/**
 * An object newed and attached to the context object.
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @param {*} origCallback
 * @param {*} [options_={}]
 */
const FuncRa = function(argv, context, callback, origCallback, options_ = {}) {
  const self = this;

  self.options          = options_;
  self.mod              = self.options.otherModule;
  self.modname          = self.options.otherModuleName || 'mod';
  self.fname            = self.options.fname || null;
  self.providedAbort    = null;
  self.argTypes         = {};
  self.args             = [];
  self.argErrs          = null;

  const verbose         = argv.verbose;
  const debug           = argv.debug        || verbose;
  const argOptions      = sg.merge({debug, verbose});

  /**
   * Wraps the body of a run-anywhere style function to help reduce complexity handling errors.
   *
   * @param {*} [functionName]
   * @param {*} body_function
   * @param {*} c_
   * @returns
   */
  self.iwrap = function(a_, b_, c_ /* abort, body_callback*/) {
    var a=a_, b=b_, c=c_;

    var fname = 'mod__func';
    if (self.fname) {
      fname = `${self.modname}__${self.fname}`;
    } else if (_.isString(a)) {
      fname = a.replace(/:/g, '_');
    }

    var   numArgs = arguments.length;
    if (!_.isString(a)) {
      b = a_;
      c = b_;
      numArgs += 1;
    }

    // console.error(`fra.iwrapping ${self.fname}`);

    var body_callback;
    if (numArgs === 2) {
      body_callback = b;
    } else {
      body_callback = c;
    }

    const my_body_callback = function(abort, ...rest) {

      // Remember the abort function that is given
      self.providedAbort = abort;

      return body_callback(abort, ...rest);
    };

    if (numArgs === 2) {
      return sg.iwrap(fname, callback, my_body_callback);
    } else {
      return sg.iwrap(fname, callback, b, my_body_callback);
    }
  };

  /**
   * Merges any special command-line given args into other objects.
   *
   * For example, `--debug` and `--verbose` are both propigated into all `argv` objects, and
   * all `options` objects.
   *
   * @param {*} [options={}]
   * @returns
   */
  self.opts = function(options = {}) {
    return sg.merge({ ...argOptions, ...options});
  };

  /**
   * Loads a run-anywhere style function, so it can be easily called by other run-anywhere
   * functions.
   *
   * 1. Remembers the `context` object, so you do not have to pass it around.
   * 2. Adds special CLI params like `--debug` and `--verbose` down to all `argv` objects.
   *
   * @param {*} module
   * @param {*} function_names
   * @param {*} options
   * @param {*} abort_function
   * @returns
   */
  self.loads = function(...args) {

    // This function just cracks the arguments, and calls loads_, which does the real work.

    const [a,b,c,d] = args;

    if (args.length === 4)        { return self.loads_(...args); }
    if (args.length === 3) {
      if (_.isString(args[0]))    { return self.loads_(self.mod, a, b, c); }

      return self.loads_(a, b, {}, c);
    }

    return self.loads_(...args);
  };

  self.loads_ = function(mod, fnames, options1, abort) {

    // Do for each function name
    return sg.reduce(fnames.split(','), {}, function(m, fname) {

      // ------------------------ The fn that gets called by you
      const interceptFn = function(argv_, options_, continuation) {

        // self.opts() propigates --debug and --verbose; options is a combination of options1 and options for this call.
        const argv      = self.opts(argv_);
        var   options   = sg.merge({...options1, ...self.opts(options_)});

        options.abort   = ('abort' in options ? options.abort : true);

        // This will be called when the called function finishes. -----
        const callback = function(err, data, ...rest) {

          // OK?
          var   ok = false;
          if (arguments.length === 0)     { ok = true; }
          if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }

          // Report normal (ok === true) and errors that are aborted (!ok && options.abort)
          if (options.debug && (ok || (!ok && options.abort))) {
            console.error(`${mod.modname || self.modname || 'modunk'}::${fname}(23)`, sg.inspect({argv, err, data, ...rest}));
          }

          // Handle errors -- we normally abort, but the caller can tell us not to
          if (!ok) {
            if (options.abort)            { return abort(err); }

            // Report, but leave out the verbose error
            if (options.debug) {
              console.error(`${mod.modname || self.modname || 'modunk'}::${fname}(42)`, sg.inspect({argv, err:(options.verbose ? err : true), data, ...rest}));
            }
          }

          // Back into your code
          return continuation(err, data, ...rest);
        };
        // -----

        if (options.verbose) {
          console.error(`${mod.modname || self.modname || 'modunk'}::${fname}(99)`, sg.inspect({argv}));
        }

        // Invoke the original function
        abort.calling(`${mod.modname || self.modname || 'modunk'}::${fname}(21)`, argv);
        return mod[fname](argv, context, callback);
      };
      // ----------------------------- end

      // Put the interception function into the object that gets returned.
      return sg.kv(m, fname, interceptFn);
    });
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

    // The first name in the list is the parameters 'real' name, the others are aliases.
    var   defName;

    // Loop over the names and see if they are in argv
    for (var i = 0; i < names.length; ++i) {
      const name = names[i];

      // Remember the real name
      if (i === 0) {
        defName = name;
        self.argTypes[name] = {name, names, options};
      }

      // If we have it, great!
      if (name in argv)                         { return recordArg(argv[name]); }

      // If the real name starts with Caps, try the camel-case version
      if (sg.isUpperCase(name[0]) && name.length > 1) {
        if (sg.toLowerWord(name) in argv)       { return recordArg(argv[sg.toLowerWord(name)]); }
      }
    }

    // If we get here, we did not find it.
    if (required) {
      self.argErrs = sg.ap(self.argErrs, {code: 'ENOARG', ...self.argTypes[defName]});
    }

    return recordArg(def);

    // Remember the args that were used, for reporting
    function recordArg(value) {
      if (!sg.isnt(value)) {

        // If the caller needs an array, arrayify it
        if (options.array && !_.isArray(value)) {
          if (_.isString(value)) {
            value = (''+value).split(',');
          } else {
            value = (''+value).split(',');
            // value = [value];
          }
        }

        // Store it
        self.args.push({names, options, value});
      }

      return value;
    }
  };

  /**
   * Returns whether there was an error (actually returns the errors.)
   *
   * * Marking `{required:true}` while getting the value
   * * Passing in all required values here.
   *
   * @param {*} [args={}]
   * @returns
   */
  self.argErrors = function(args = {}) {
    _.each(args, function(value, name) {
      if (sg.isnt(value)) {
        self.argErrs = sg.ap(self.argErrs, {code: 'ENOARG', ...self.argTypes[name]});
      }
    });

    // console.error(`fra.argErrors ${self.fname} (${(self.argErrs || []).length})`);
    return self.argErrs;
  };

  /**
   * Aborts!
   *
   * @param {*} msg
   */
  self.abort = function(msg) {
    const { fname, argTypes, args } = self;

    console.error(`FuncRa aborting`, sg.inspect({fname, argTypes, args}));
    self.providedAbort((self.argErrs || [])[0], null, msg || 'missing arg');
  };

};

// -------------------------------------------------------------------------------------
//  Helper functions
//


