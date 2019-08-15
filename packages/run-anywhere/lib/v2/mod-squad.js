

// -------------------------------------------------------------------------------------
//  requirements
//

const sg                      = require('sg-flow');
const _                       = require('lodash');
const reqResContext           = require('./req-res-context');
const utilLib                 = require('util');
const libUrl                  = require('url');
const libMakeCommand          = require('./make-command');
const libWrapped              = require('./wrapped');
const utils                   = require('../utils');

const promisify               = utilLib.promisify;
const callbackify             = utilLib.callbackify;

const commandInvoke           = libMakeCommand.invoke;
const {
  mkResponse, ensureContext
}                             = reqResContext;

// -------------------------------------------------------------------------------------
//  Data
//
var   loadedModules             = {};
const inverseOptionsNonFnList   = 'wrapper'.split(',');


// -------------------------------------------------------------------------------------
//  Functions
//

const registerModule = function(mod, name) {
  if (loadedModules[name]) {
    loadedModules[`${name}_${sg.numKeys(loadedModules)}`] = loadedModules[name];
    // name += sg.numKeys(loadedModules);
  }

  loadedModules[name] = mod;
};

const ModSquad = function(otherModule, otherModuleName = 'mod') {
  var   self      = this;

  registerModule(otherModule, otherModuleName);

  self.utils      = {_, ...utilLib};

  otherModule.exports.modname   = otherModuleName;
  otherModule.exports.async     = otherModule.exports.async || {};

  self.xport = function(fobj_) {
    var previousFn;

    var   inverseOptions = {};
    const fobj = sg.reduce(fobj_, {}, (m,v,k) => {
      if (k in inverseOptionsNonFnList && !_.isFunction(v)) {
        inverseOptions[k] = v;
        return m;
      }

      return sg.kv(m, k, v);
    });

    _.each(fobj, (fn_, fnName) => {
      var fn            = fn_;

      // Wrap `fn` in a safety function that scrubs debug info out of the result
      if (fn) {

        // This is the function that will be exported and called by those that require() the mod. ----------------------------------------
        fn = function(argv, context, callback_) {

          var   { ractx }          = upsertRaContextForX(context, otherModuleName, fnName);

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
         setRax(context, new FuncRa(argv, context, callback, callback_, ractx, {otherModule: otherModule.exports, otherModuleName, fnName, inverseOptions}));

          // Call the modules function (the original function.)
          return fn_(argv, context, callback);
        };
        // ----------------------------------------
      }

      // Export the modules function (the original function.)
      otherModule.exports[fnName]        = previousFn = (fn || previousFn);
      otherModule.exports.async[fnName]  = promisify(fn || previousFn);
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

  self.reqHandler = function(fobj_) {
    var   mod = loadedModules[otherModuleName];

    var previousFn;

    var inverseOptions = {};
    const fobj = sg.reduce(fobj_, {}, (m,v,k) => {
      if (k in inverseOptionsNonFnList && !_.isFunction(v)) {
        inverseOptions[k] = v;
        return m;
      }

      return sg.kv(m, k, v);
    });

    _.each(fobj, (fn_, fnName) => {
      var fn            = fn_;

      // Wrap `fn` in a safety function that scrubs debug info out of the result
      if (fn) {

        // This is the function that will be exported and called by those that require() the mod. ----------------------------------------
        fn = function(req, res, ...rest) {


          // Must create argv, context
          var   argv                  = {};     /* TODO: get from query, body, etc */
          const callback_             = function(){};

          var   rax_;

          // The abort function to translate error-first style to HTTP codes-style
          const abort = function(err, msg) {
            if (msg) { sg.logError(err, msg, {}, {EFAIL: fnName}); }

            if (rax_) {
              sg.elog(longFnName(), {err});
            }

            const code = decodeErrForHttp(err, msg);
            return mkResponse(code, req, res, err, {}, {msg});
          };

          const callback = function(err, data, ...rest) {
            if (err) {
              return abort(err);
            }

            // Todo: log
            return mkResponse(200, req, res, err, {...data, ...(sg.merge(...rest))});
          };

          var   { ractx, context }    = upsertRaContextForReqRes(req, res, otherModuleName, fnName);

          // ------ This is where you apply a middleware function -------

          // Attach a special run-anywhere object to the context.
          const { rax } =  setRax(context, new FuncRa(argv, context, callback, callback_, ractx, {otherModule: otherModule.exports, otherModuleName, fnName, inverseOptions}));
          rax_ = rax;

          // The abort function to translate error-first style to HTTP codes-style
          rax.defaultAbort = abort;

          // Call the modules function (the original function.)
          return fn_(req, res, ...rest);
        };
      }

      mod.reqHandler          = mod.reqHandler   || {};
      mod.reqHandler[fnName]  = previousFn = (fn || previousFn);
    });

    return previousFn;
  };

  self.exportSubModules = function(subModules) {
    return module.exports.exportSubModules(otherModule, subModules);
  };

};

function decodeErrForHttp(err, msg) {
  if (sg.isnt(err))     { return 200; }

  var   result = 400;   /* in the face of no other evidence, general user error */

  if (sg.isObject(err)) {
    let code = err.code || err.httpCode;
    if (code)                         { return result = code; }
  }

  if (_.isString(err)) {
    if (err.startsWith('ENO'))        { return result = 400; }   /* user-paramteter wrong */
  }

  if (_.isString(msg)) {
    if (msg.match(/not found/i))      { return result = 404; }   /* not found */
  }

  return result;
}

module.exports.modSquad = function(...args) {
  return new ModSquad(...args);
};

module.exports.addSubModules = function(obj, subModules) {
  _.each(subModules, lib => {
    _.each(lib, function(v,k) {
      obj[k] = v;
    });
  });
};

module.exports.exportSubModules = function(mod, subModules) {
  _.each(subModules, lib => {
    _.each((lib.async || {}), function(v,k) {
      mod.exports.async = mod.exports.async || {};

      mod.exports.async[k]  = v;
      mod.exports[k]        = lib[k];
    });
  });
};




// TODO: also need loadAsync
module.exports.load = function(mod, fnName) {
  return mod[fnName];
};

module.exports.loads = function(mod, fnNames, context, options1, abort) {
  // const loadedFn =  mod[fnName];

  return sg.reduce(fnNames.split(','), {}, function(m, fnName) {

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

        if (options.ddebug) {
          console.error(`mod::${fnName}()`, sg.inspect({argv, err, data, ...rest}));
        }

        return continuation(err, data, ...rest);
      };

      abort.calling(`${fnName}()`, argv);
      return mod[fnName](argv, context, callback);
    };
    // ----------------------------- end

    return sg.kv(m, fnName, interceptFn);
  });
};

/**
 * An object newed and attached to the context object.
 *
 * This is the object that is usually named `rax`.
 *
 * @param {*} argv            - The canonical run-anywhere argv object.
 * @param {*} context         - The canonical run-anywhere context object.
 * @param {*} callback        - The specially-made function to inspect for errors.
 * @param {*} origCallback    - The caller-supplied original callback.
 * @param {*} ractx           - The ractx object.
 * @param {*} [options_={}]   - Options.
 */
const FuncRa = function(argv, context, callback, origCallback, ractx, options_ = {}) {
  // TODO put check here
  // sg.check(99, __filename, {argv}, {context}, 'runAnywhere', {ractx});
  const self = this;

  self.options          = options_;
  self.mod              = self.options.otherModule;
  self.modname          = self.options.otherModuleName || 'mod';
  self.fnName           = self.options.fnName || self.options.fname || null;
  self.defaultAbort     = self.options.abort;
  self.providedAbort    = null;
  self.argTypes         = {};
  self.args             = [];
  self.argErrs          = null;

  const inverseOptions  = options_.inverseOptions || {};

  const verbose         = argv.verbose      || (context.ARGV && context.ARGV.verbose);
  const debug           = argv.debug        || (context.ARGV && context.ARGV.debug)    || verbose;
  const vverbose        = argv.vverbose     || (context.ARGV && context.ARGV.vverbose);
  const ddebug          = argv.ddebug       || (context.ARGV && context.ARGV.ddebug)   || vverbose;

  const forceSilent     = argv.forceSilent  || inverseOptions.wrapper  || (context.ARGV && context.ARGV.forceSilent);
  const silent          = argv.silent       || (context.ARGV && context.ARGV.silent)   || forceSilent;
  const argOptions      = sg.merge({debug, verbose, ddebug, vverbose, forceSilent, silent});

  const longFnName = function() {
    if (self.fnName) {
      return `${self.modname}__${self.fnName}`;
    }

    return `${self.modname}__unnamed`;
  };

  self.mkLocalAbort = function(finalizer) {
    const localAbort = function(err, msg) {
      if (msg) { sg.logError(err, msg, {}, {EFAIL:self.fnName}); }

      sg.elog(longFnName(), {err});
      return finalizer(err);
    };

    return localAbort;
  };

  self.wrapFns = function(...args) {
    const mod       = (sg.isObject(args[0]) ? args.shift() : self.mod);
    const fnNames   = args.shift();
    const options   = (sg.isObject(args[0]) ? args.shift() : self.opts({}));
    var   abort     = args.shift();

    abort           = abort || self.providedAbort || abort;

    return libWrapped.mkFns2(mod, fnNames, options, abort);
  };

  /**
   * Merges any special command-line given args into other objects.
   *
   * For example, `--debug` and `--verbose` are both propigated into all `argv` objects, and
   * all `options` objects.
   *
   * @param {object} [argv={}]    - The current args to merge in.
   * @param {object} [options={}] - Controlling options.
   *
   * @returns {null}            - [[return is only used for control-flow.]]
   */
  self.opts = function(argv = {}, options={}) {
    var   opts = sg.merge({ ...argOptions, ...argv});

    if (options.cleanArgv) {
      opts = utils.omitDebug(opts);
    }

    return opts;
  };

  /**
   * Wraps the body of a run-anywhere style function to help reduce complexity handling errors.
   *
   * @param {*} [a_]         - `functionName` The name of the function that is iwrapped, used in messages.
   * @param {*} [b_]         - `abort` A custom abort function (when you need to release resources, for example.
   * @param {*} c_           - `body_callback` The function being iwrapped.
   *
   * @returns {null}            - [[return is only use for control-flow.]]
   */
  self.iwrap = function(a_, b_, c_ /* abort, body_callback*/) {
    var a=a_, b=b_, c=c_;

    var fnName = 'mod__func';
    if (self.fnName) {
      fnName = `${self.modname}__${self.fnName}`;
    } else if (_.isString(a)) {
      fnName = a.replace(/:/g, '_');
    }

    var   numArgs = arguments.length;
    if (!_.isString(a)) {
      b = a_;
      c = b_;
      numArgs += 1;
    }

    // console.error(`fra.iwrapping ${self.fnName}`);

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
      return sg.iwrap(fnName, callback, my_body_callback);
    } else {
      return sg.iwrap(fnName, callback, b, my_body_callback);
    }
  };

  /**
   * Wraps the body of a run-anywhere style function to help reduce complexity handling errors.
   *
   * A lot like iwrap, except:
   *
   * 1. Less complex parameter options (no name).
   * 2. Abort can be read from the Rax object (self).
   *
   * @param {*} [abort]         - A custom abort function (when you need to release resources, for example.
   * @param {*} body_callback   - The function being iwrapped.
   *
   * @returns {null}            - [[return is only use for control-flow.]]
   */
  self.iwrap2 = function(...args /* abort, body_callback*/) {
    const [a, b] = args;

    if (args.length === 2) {
      return self._iwrap2_(a, b);
    }
    return self._iwrap2_(null, a);
  };


  self._iwrap2_ = function(abort_, body_callback) {
    var   abort             = abort_ || self.defaultAbort || abort_;

    const fnName            = `${self.modname}__${self.fnName}`.replace(/:/g, '_');
    const my_body_callback  = function(providedAbort, ...rest) {

      // Remember the abort function that is given -- it is the right one
      self.providedAbort = providedAbort;

      return body_callback(providedAbort, ...rest);
    };

    if (abort) {
      return sg.iwrap(fnName, callback, abort, my_body_callback);
    }
    return sg.iwrap(fnName, callback, my_body_callback);
  };

  self.__run2 = function(...args) {
    return sg.__run2(...args);
  };

  /**
   * Loads a run-anywhere style function, so it can be easily called by other run-anywhere
   * functions.
   *
   * If you are calling a (argv, context, callback) run-anywhere function from another one, use `loads()`.
   * If you are calling a (argv, context, callback) run-anywhere function from one that isnt, use `invokers()`.
   *
   * 1. Remembers the `context` object, so you do not have to pass it around.
   * 2. Adds special CLI params like `--debug` and `--verbose` down to all `argv` objects.
   *
   * @param {*} [module]            - The module to load from. Not required when loading from your own module.
   * @param {*} function_names      - The function names to load.
   * @param {*} options             - Any options, like {abort:false}.
   * @param {*} abort_function      - The abort function to use.
   *
   * @returns {null}  - [[return is just used for control-flow.]]
   */
  self.loads = function(...args) {

    // This function just cracks the arguments, and calls loads_, which does the real work.

    const mod       = (sg.isObject(args[0]) ? args.shift() : self.mod);
    const fnNames   = args.shift();
    const options   = (sg.isObject(args[0]) ? args.shift() : self.opts({}));
    var   abort     = args.shift();

    abort           = abort || self.providedAbort || abort;

    return self.loads_(mod, fnNames, options, abort);
  };

  self.loads_ = function(mod, fnNames, options1, abort) {
    // TODO use sg.check
    // const fnNames = (_.isArray(fnNames_) ? fnNames_ : [fnNames_]);

    // Do for each function name
    return sg.reduce(fnNames.split(','), {}, function(m, fnName) {

      // ------------------------ The proxy for the function that was loaded
      const interceptFn = function(argv_, options2, continuation) {

        if (!_.isFunction(continuation))    { sg.warn(`continuation for ${fnName} is not a function`); }

        // self.opts() propigates --debug and --verbose; options is a combination of options1 and options2 for this call.
        var   options   = sg.merge({...(options1 || {}), ...self.opts(options2)});
        var   argv      = self.opts(argv_, options);

        // argv            = removeContextAndEvent(argv);
        options.abort   = ('abort' in options ? options.abort : true);

        // This will be called when the called function finishes. -----
        const callback = function(err, data, ...rest) {

          // The called function just finished, and we will call the callers continuation soon, but first
          //    check for errors and do some logging.

          // OK?
          var   ok = false;
          if (arguments.length === 0)     { ok = true; }
          if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }

          // Report normal (ok === true) and errors that are aborted (!ok && options.abort)
          if (options.ddebug && (ok || (!ok && options.abort))) {
            console.error(`${mod.modname || self.modname || 'modunk'}::${fnName}(96)`, sg.inspect({argv, ok, err, data: sg.small(data), ...rest}));
          }

          // Handle errors -- we normally abort, but the caller can tell us not to
          if (!ok) {
            if (options.abort && abort)            { return abort(err); }

            // Report, but leave out the verbose error
            if (options.ddebug) {
              console.error(`${mod.modname || self.modname || 'modunk'}::${fnName}(97)`, sg.inspect({argv, err:(options.vverbose ? err : true), data: sg.small(data), ...rest}));
            }
          }

          // Continue with the callers code
          return continuation(err, data, ...rest);   /* ... not a function === 3rd param to loads()-loaded function wasnt a function */
        };
        // -----

        if (options.vverbose) {
          console.error(`${mod.modname || self.modname || 'modunk'}::${fnName}(99)`, sg.inspect({argv, fnName}));
        }

        // Invoke the original function
        if (abort && options.abort && abort.calling)  { abort.calling(`${mod.modname || self.modname || 'modunk'}::${fnName}(98)`, argv); }
        return mod[fnName](argv, context, callback);
      };
      // ----------------------------- end

      // Put the interception function into the object that gets returned.
      return sg.kv(m, fnName, interceptFn);
    });
  };

  /**
   * Loads a run-anywhere style function, so it can be easily called by other run-anywhere
   * functions.
   *
   * If you are calling a (argv, context, callback) run-anywhere function from another one, use `loads()`.
   * If you are calling a (argv, context, callback) run-anywhere function from one that isnt, use `invokers()`.
   *
   * 1. Remembers the `context` object, so you do not have to pass it around.
   * 2. Adds special CLI params like `--debug` and `--verbose` down to all `argv` objects.
   *
   * @param {*} [module]            - The module to load from. Not required when loading from your own module.
   * @param {*} function_names      - The function names to load.
   * @param {*} options             - Any options, like {abort:false}.
   * @param {*} abort_function      - The abort function to use.
   *
   * @returns {null}  - [[return is just used for control-flow.]]
   */
  self.loads2 = function(...args) {

    // This function just cracks the arguments, and calls loads_, which does the real work.

    const mod       = (sg.isObject(args[0]) ? args.shift() : self.mod);
    const fnNames   = args.shift();
    const options   = (sg.isObject(args[0]) ? args.shift() : self.opts({}));
    var   abort     = args.shift();

    abort           = abort || self.providedAbort || abort;

    return self.loads2_(mod, fnNames, options, abort);
  };

  // Same as loads2, but used when one ra-style function calls another, but does no real work
  // (at least according to the semantics of the app -- like a wrapper function that just parses
  // function parameters, and calls the 'real' function to do the real work.)
  self.loadsDirect2 = function(...args) {

    // This function just cracks the arguments, and calls loads_, which does the real work.

    const mod       = (sg.isObject(args[0]) ? args.shift() : self.mod);
    const fnNames   = args.shift();
    const options   = (sg.isObject(args[0]) ? args.shift() : self.opts({}));
    const abort     = args.shift();

    // return self.loads2(mod, fnNames, {...options, forceSilent:true}, abort);
    return self.loads2_(mod, fnNames, options, abort);
  };

  self.loads2_ = function(mod, fnNames, options1, abort) {
    // TODO use sg.check
    // const fnNames = (_.isArray(fnNames_) ? fnNames_ : [fnNames_]);

    // Do for each function name
    return sg.reduce(fnNames.split(','), {}, function(m, fnName) {

      // ------------------------ The proxy for the function that was loaded
      const interceptFn = function(...args_) {    // argv_, options2, continuation
        var   args          = _.toArray(args_);
        const continuation  = args.pop();
        const options2      = (args.length > 1 ? args.pop() : {});
        const argv_         = args.pop();

        if (!_.isFunction(continuation))    { sg.warn(`continuation for ${fnName} is not a function`); }

        // self.opts() propigates --debug and --verbose; options is a combination of options1 and options2 for this call.
        var   options   = sg.merge({...(options1 || {}), ...self.opts(options2)});
        var   argv      = self.opts(argv_, options);
        var   logArgv   = utils.omitDebug(argv);

        options.abort   = ('abort' in options ? options.abort : true);

        // This will be called when the called function finishes. -----
        const callback = function(err, data, ...rest) {

          // The called function just finished, and we will call the callers continuation soon, but first
          //    check for errors and do some logging.

          // OK?
          var   ok = false;
          if (arguments.length === 0)     { ok = true; }
          if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }

          // Report normal (ok === true) and errors that are aborted (!ok && options.abort)
          if (options.ddebug && (ok || (!ok && options.abort))) {
            if (!options.forceSilent) { sg.elog(`__dd__ ${mod.modname || self.modname || 'modunk'}::${fnName}(86)`, {argv:logArgv, ok, err, data: sg.small(data), ...rest}); }
          }

          // Handle errors -- we normally abort, but the caller can tell us not to
          if (!ok) {
            if (options.abort && abort)            { return abort(err); }

            // Report, but leave out the verbose error
            if (options.ddebug) {
              if (!options.forceSilent) { sg.elog(`__dd__ ${mod.modname || self.modname || 'modunk'}::${fnName}(87)`, {argv:logArgv, err:(options.vverbose ? err : true), data: sg.small(data), ...rest}); }
            }
          }

          // Continue with the callers code
          return continuation(err, data, ...rest);   /* ... not a function === 3rd param to loads()-loaded function wasnt a function */
        };
        // -----

        if (options.vverbose) {
          if (!options.forceSilent) { sg.elog(`__vv__ ${mod.modname || self.modname || 'modunk'}::${fnName}(89)`, {argv:logArgv, fnName}); }
        }

        // Invoke the original function
        if (abort && options.abort && abort.calling)  { abort.calling(`__aa__ ${mod.modname || self.modname || 'modunk'}::${fnName}(98)`, logArgv); }
        return mod[fnName](argv, context, callback);
      };
      // ----------------------------- end

      // Put the interception function into the object that gets returned.
      return sg.kv(m, fnName, interceptFn);
    });
  };

  /**
   * Loads a run-anywhere invoke style function, so it can be easily called by other run-anywhere
   * functions.
   *
   * If you are calling one run-anywhere continuation-style function (argv, context, callback) from another, use `loads()`.
   * If you are calling a run-anywhere continuation-style function (argv, context, callback) from a function that is not
   * that style, use `invokers()`.
   *
   * 1. Remembers the `context` object, so you do not have to pass it around.
   * 2. Adds special CLI params like `--debug` and `--verbose` to all `argv` objects.
   *
   * @param {*} mod                 - The module to load from. Not required when loading from your own module.
   * @param {*} fnNames             - The function names to load.
   * @param {*} options             - Any options, like {abort:false}.
   * @param {*} abort_               - The abort function to use.
   *
   * @returns {null}  - [[return is just used for control-flow.]]
   */
  self.invokers = function(...args) {
    const mod       = (sg.isObject(args[0]) ? args.shift() : self.mod);
    const fnNames   = args.shift();
    const options   = (sg.isObject(args[0]) ? args.shift() : self.opts({}));
    var   abort     = args.shift();

    abort           = abort || self.providedAbort || abort;

    return self.invokers_(mod, fnNames, options, abort);
  };

  self.invokers_ = function(mod, fnNames, options, abort_) {
    // TODO sg.check

    const abort = abort_ || self.providedAbort || abort_;

    // Do for each function name
    return sg.reduce(fnNames.split(','), {}, function(m, fnName) {
      const invokeOpts  = {mod, fnName, hostModName: self.modname, hostMod: self.mod};

      // ------------------------ The proxy for the function that was loaded
      const interceptFn = function(argv, continuation) {

        if (!_.isFunction(continuation))    { sg.warn(`continuation for ${fnName} is not a function`); }

        // Invoke the original function
        return commandInvoke(invokeOpts, options, self.opts(argv, options), ractx, continuation, abort);
      };
      // ----------------------------- end

      // Put the interception function into the object that gets returned.
      return sg.kv(m, fnName, interceptFn);
    });
  };

  /**
   * Returns argv[one of the names].
   *
   * @param {*} argv            - The canonical run-anywhere argv argument.
   * @param {*} names_          - Name of the arg, plus aliases to use.
   * @param {*} [options={}]    - Options for the arg, like {required:true}
   *
   * @returns {*}               - The value, or `undefined` if not found.
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
      self.argErrs = sg.ap(self.argErrs, {code: 'ENOARG0', ...self.argTypes[defName], defName, names_, options});
    }

    return recordArg(def);

    // Remember the args that were used, for reporting
    function recordArg(value) {

      if (options.json) {

        // Do our best to corece it into JSON
        if (!sg.isObject(value) && !_.isArray(value)) {
          if (_.isString(value)) {
            value = sg.safeJSONParse(value);
          }
        }

        // If still not an Object or Array, might be an error
        if (!sg.isObject(value) && !_.isArray(value)) {
          if (required) {
            self.argErrs = sg.ap(self.argErrs, {code: 'ENOTJSON', ...self.argTypes[defName]});
            return recordArg2(def);

          } else {
            value = { __just__ : value };
          }
        }
      }

      return recordArg2(value);
    }

    function recordArg2(value) {
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
   * Returns argv[one of the names], and removes the found keys.
   *
   * @param {*} argv            - The canonical run-anywhere argv argument.
   * @param {*} names_          - Name of the arg, plus aliases to use.
   * @param {*} [options={}]    - Options for the arg, like {required:true}
   *
   * @returns {*}               - The value, or `undefined` if not found.
   */
  self.extractArg = function(argv, names_, options = {}) {

    // Get the result from `arg()`
    const result = self.arg(argv, names_, options);

    const names     = names_.split(',');

    // Loop over the names and see if they are in argv
    for (var i = 0; i < names.length; ++i) {
      const name = names[i];

      // If we have it, great!
      if (name in argv)                         { removeKey(name); }

      // If the real name starts with Caps, try the camel-case version
      if (sg.isUpperCase(name[0]) && name.length > 1) {
        if (sg.toLowerWord(name) in argv)       { removeKey(sg.toLowerWord(name)); }
      }
    }

    return result;

    // Remember the args that were used, for reporting
    function removeKey(key) {
      delete argv[key];
    }
  };

  /**
   * Returns whether there was an error (actually returns the errors.)
   *
   * * Marking `{required:true}` while getting the value
   * * Passing in all required values here.
   *
   * @param {*} [args_={}]     - A list of extra values to check.
   *
   * @returns {Object}        - The errors
   */
  self.argErrors = function(args_ = {}) {
    var args  = args_;

    if (args.oneOf) {
      let keys = Object.keys(args.oneOf);
      if (keys.filter((name) => !sg.isnt(args.oneOf[name])).length === 0) {
        self.argErrs = sg.ap(self.argErrs, {code: 'ENEEDONEOF', params: keys.map(key => self.argTypes[key])});
      }
    } else {
      _.each(args, function(value, name) {
        if (sg.isnt(value)) {
          self.argErrs = sg.ap(self.argErrs, {code: 'ENOARG1', ...self.argTypes[name], name, value:`${value}`, args, args_});
        }
      });
    }


    // console.error(`fra.argErrors ${self.fnName} (${(self.argErrs || []).length})`);
    return self.argErrs;
  };

  /**
   * Aborts!
   *
   * @param {*} msg - The message to show.
   */
  self.abort = function(msg) {
    const { fnName, argTypes, args } = self;

    console.error(`FuncRa aborting`, sg.inspect({fnName, argTypes, args}));

    if (args.length === 0) {
      // No args, show available args
      console.error('');
      console.error(`Available args: ${sg.keys(argTypes).join(', ')}`);
      console.error('');
    }

    self.providedAbort((self.argErrs || [])[0], null, msg || 'missing arg');
  };

};

// -------------------------------------------------------------------------------------
//  Helper functions
//

exports.getContext            = getContext;
exports.getRaContext          = getRaContext;
exports.upsertRaContextForX   = upsertRaContextForX;
exports.omitDebug             = utils.omitDebug;
exports.extractDebug          = utils.extractDebug;
exports.extractParams         = utils.extractParams;
exports.omitSystem            = utils.omitSystem;
exports.pickDebug             = utils.pickDebug;
exports.pickParams            = utils.pickParams;

function getRaContext(context) {
  return context.runAnywhere;
}

function upsertRaContextForReqRes(req, res, modname, fnName) {
  var   contextDottedPath='context', eventDottedPath='event';

  if (req.apiGateway) {
    contextDottedPath = `apiGateway.context`;
    eventDottedPath   = `apiGateway.event`;
  }

  const {context} = ensureContext(req, res, contextDottedPath, eventDottedPath);
  return upsertRaContextForX(context, modname, fnName);
}

function upsertRaContextForX(context, modname, fnName) {
  // if (getRaContext(context))          { return getRaContext(context); }

  const fullFnName          = `${modname}__${fnName}`;
  var   ractx               = context.runAnywhere = context.runAnywhere || {current: {}};

  ractx[fullFnName]          = {};
  ractx.current.modname     = modname;
  ractx.current.fnName       = fnName;
  ractx.current.fullFnName   = fullFnName;

  sg.setOn(ractx, ['mod', modname, 'func', fnName], {fullFnName, rax: null, fra:null});

  return { ractx, context };
}

function setRax(context, rax) {
  var   ractx                 = context.runAnywhere;
  const {
    modname, fnName, fullFnName
  }                           = ractx.current;

  ractx.current.rax           = rax;
  ractx[fullFnName].rax        = rax;
  ractx[fullFnName].fra        = rax;

  sg.setOn(ractx, ['mod', modname, 'func', fnName, 'rax'], rax);

  // sg.debugLog(`setRax`, {ractx});

  return { ractx, rax };
}

function getContext(context={}, argv=null, level=1) {
  const ractx         = context.runAnywhere || {};
  const rax           = (ractx.current || {}).rax || {};

  var   result = sg.merge({ractx, rax});

  if (level >= 1) {
    result = sg.merge(result, {
      stage:            getStage(context, argv, ractx),
      isApiGateway:     getIsApiGateway(context, argv, ractx),
      isAws:            getIsAws(context, argv, ractx),
    });
  }

  return result;
}

function getStage(context, argv, ractx) {
  if (context.invokedFunctionArn) {
    return _.last(context.invokedFunctionArn.split(':'));
  }

  if (argv && (argv.stageVariables || {}).lambdaVersion) {
    return argv.stageVariables.lambdaVersion;
  }

  if (ractx.stage) {
    return ractx.stage;
  }

  if (ractx.req_url) {
    let url     = libUrl.parse(ractx.req_url);
    let parts   = sg.rest(url.pathname.split('/'));
    if (parts.length > 1) {
      return parts[0];
    }
  }

  return process.env.STAGE || process.env.AWS_ACCT_TYPE;
}

function getIsApiGateway(context, event, ractx) {
  // console.log(`giag`, sg.inspect({context, event})); // too complex to log

  if ('isApiGateway' in context) {
    return context.isApiGateway;
  }

  if (event && event.requestContext) {
    return /amazonaws/i.exec((event.requestContext || {}).domainName || '');
  }

  const domainName = sg.deref(event || {}, `argv.event.requestContext.domainName`);
  // console.log(`giag`, sg.inspect({domainName}));
  if (domainName) {
    return /amazonaws/i.exec(domainName);
  }

  return false;
}

function getIsAws(context, event, ractx) {
  if ('awsRequestId' in context) {
    return true;
  }

  return false;
}

function removeContextAndEvent(argv_) {
  // Strip out context and event
  var   event;
  var   argv  = sg.reduce(argv_, {}, (m,v,k) => {
    if (k === 'context')    { return m; }
    if (k === 'event')      { event = event || v; return m; }

    if (sg.isObject(v)) {
      return sg.kv(m, k, _.omit(v, 'context', 'event'));
    }

    return sg.kv(m, k, v);
  });

  if (event) {
    argv.event = event;
  }

  return argv;
}
