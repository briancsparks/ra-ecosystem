/* eslint-disable valid-jsdoc */

const sg0                     = require('sg0');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-argv'));
const { _ }                   = sg;
const {scrunch}               = sg;
const { JsonSocketIoLogger }  = require('./logging-json-to-socket-io');
const Ajv                     = require('ajv');
const { util }                = sg.libs;
const { toError }             = require('./error');

const ENV                     = sg.ENV();
const ARGV                    = sg.ARGV();

module.exports.Diagnostic     = Diagnostic;
module.exports.diagnostic     = diagnostic;
module.exports.fromContext    = fromContext;
module.exports.setContextItem = setContextItem;
module.exports.getContextItem = getContextItem;






module.exports.cleanBits      = cleanBits;
module.exports.cleanDiag      = cleanDiag;
module.exports.cleanDIAG      = cleanDIAG;

module.exports.cleanContext = function(context_) {

  var   context = {};
  var   {runAnywhere, sgDiagnostic, ...rest} = context_;

  context = {...context,
    ...rest,
    sgDiagnostic: {     ...sgDiagnostic,
      diag:               cleanDiag(sgDiagnostic.diag),

      diagFunctions: sgDiagnostic.diagFunctions.map(df => {
        const {argv,context,...rest} = df;

        return {
          ...rest,
          argv,
          context:        '--removed--',
        };
      }),
    },
  };

  return {context};
};
const cleanContext = module.exports.cleanContext;

function cleanDiag(diag__) {
  const diag_ = nofun(diag__);

  var diag = {
    ___a:           '+++diag+++',
    ...diag_,
    DIAG:           cleanDIAG(diag_.DIAG),
    bits:           cleanBits(diag_.bits),
    ___z:           '---diag---',
  };

  return diag;
}

function cleanDIAG(DIAG__) {
  const DIAG_ = nofun(DIAG__);

  var DIAG = {
    ___a:           '+++DIAG+++',
    ...DIAG_,
    context:        '--removed--',
    bits:             cleanBits(DIAG_.bits),
    diag:             cleanDiag2(DIAG_.diag),
    dg:               cleanDiag2(DIAG_.dg),
    ___z:           '---DIAG---',
  };

  return DIAG;
}

function cleanBits(bits__) {
  const bits_ = nofun(bits__);

  var bits = {
    ___a:                 '+++bits+++',
    ...bits_,
    pieces:                 bits_.pieces,
    ___z:                 '---bits---',
  };

  return bits;
}

function cleanDiag2(diag_) {

  return '__RemovedCircular__';
}

function nofun(x) {
  const keys = Object.keys(x ||{});

  return keys.reduce((m,key) => {
    const fn = x[key];
    if (typeof fn === 'function') {
      return m;
    }

    return {...m, [key]: fn};
  }, {});
}




function Diagnostic(ctorArgs ={}) {
  if (!(this instanceof Diagnostic))     { return new Diagnostic(ctorArgs); }

  var   self    = this;

  self.fnName   = ctorArgs.fnName;
  self.DIAG     = {};
  self.errors   = [];

  self.logger   = null;
  self.close    = function(){};

  if (ENV.at('USE_SOCKETIO_DIAG')) {
    self.logger   = new JsonSocketIoLogger();

    self.close = function() {
      self.logger.close();
    };
  }

  self.getCurrFnName = function() {
    return self.fnName || self.DIAG.getCurrFnName();
  };


  self.args = function() {
    const argv        = self.getArgv(ctorArgs);
    const currFnName  = self.DIAG.getCurrFnName()   || '';

    // self.tbd(`diagctx`, `selfargs`, '', {argv,ctorArgs});

    // -------------------- Get argv elements --------------------

    // Get all the data from the `argv` that was passed in at the beginning of the fn (the ctorArgs)
    var   argvOut = sg.reduce(argv, {}, (m, v, k) => {
      if (!_.isFunction(v)) {
        return sg.kv(m, k, sg.smartValue(v));
      }

      return m;
    });

    // Handle aliases
    //
    //  like this {
    //    lambdaName: 'name,lambda_name',
    //    class_b:    'classB,b'
    //  }
    //
    //  where the user can use 'name' as an alias for the 'lambdaName' arg.)

    // `argSpec` would be the above object (with lambdaName and class_b keys)
    const argSpec = self.DIAG.getAliases() || {};

    // aliasesStr === 'name,lambda_name';  name === 'lambdaName'; so, we might have argv.name = 'myFn',
    //   which should be argv.lambdaName = 'myFn'
    argvOut = sg.reduce(argSpec, argvOut, (m, aliasesStr, name) => {

      // Make an Array from the string list
      const aliases = sg.arrayify(aliasesStr);
      _.each(aliases, alias => {

        // Is the alias in argv? (Is 'name' in argv?)
        if (alias in argv) {
          // self.w_if(name in m, `Already have ${name}; adding alias ${alias}`);
          m[name] = argv[alias];
        }
      });

      return m;
    });

    return argvOut;
  };





  self.haveArgs = function(inputArgs, computedArgs ={}) {

    // See what's missing out of the caller-supplied args
    _.each(inputArgs, (arg, name) => {
      if (sg.isnt(arg)) {
        const msg = `ENOARG: '${name}'`;
        self.e(msg, msg);
        self.errors.push(toError(msg, {cause: `A required argument was not supplied.`, name, fnName:  self.getCurrFnName(), fatal: true}));
      }
    });

    // See whats missing from the computed args
    _.each(computedArgs, (arg, name) => {
      if (sg.isnt(arg)) {
        const msg = `WNOARG: '${name}'`;
        self.e(msg, msg);
        self.errors.push(toError(msg, {cause: `An important, but not required argument was not supplied.`, name, fnName: self.getCurrFnName(), fatal: false}));
      }
    });

    // ---------- Validate with JSON Schema ----------

    // Now we have the users proposed argv -- validate it
    const schema      = self.DIAG.getSchema()       || {};

    // TODO: Add {useDefaults:"empty", coerceTypes:true} once we can handle the data being changed
    var   validator   = new Ajv({allErrors: true, verbose: true});
    const valid       = validator.validate(schema, {...inputArgs, ...computedArgs});

    if (!valid) {
      self.e(validator.errorsText());
      if (self.getArgv(ctorArgs).verbose) {
        self.e(`Diagnostic.haveArgs`, ...validator.errors);
      }

      self.errors = [...self.errors, ...(validator.errors.map(e => toError(e)))];
      self.errors.push(toError(validator.errorsText()));
    }

    return self.errors.length === 0;
  };




  /**
   * This is the function that gets called when the app is giving up and exiting.
   *
   * The main weirdness of this function is because we have to determine what model
   * the app is currently running under. Should we throw? Should we callback(err)? Etc.
   *
   * There is also the issue that the immediate caller can pass in (err, ...data), but
   * we might also be storing errors that weve seen.
   *
   * @param {*}         err       - The typical Node.js first-parameter err object
   * @param {[Object]}  results   - The typical Node.js not-first-parameter data result object
   * @returns {*}       nothing
   */
  self.exit = function(err, ...results) {

    // See if there was a callback function to use.
    const callback    = getCallback(ctorArgs);

    // TODO: Check self.errors, callback, etc.
    if (sg.isnt(callback)) {
      if (self.errors.length > 0) {
        // An ERROR, and no callback function... Must throw
        throw toError('ENOTVALID', self.errors, 400);
      }

      /* otherwise -- success */
      return results[0];
    }

    if (_.isFunction(callback)) {
      if (self.errors.length > 0) {
        // An ERROR, but we have a callback function.
        return callback(toError('ENOTVALID', self.errors, 400));
      }

      /* otherwise -- success */
      return callback(err, ...results);
    }

    // Not sure what here -- we have `callback`, but it is not a function
    return results[0];
  };


  /**
   * A lot like exit(), but for normal fns.
   *
   * Knows about self.errors, but can pass an error in.
   *
   * @param {*} err       -- The caller can specify an error
   * @param {*} result    -- The thing to return
   * @param {*} errmsg    -- A message if there is an error
   * @returns
   */
  self.earlyreturn = function(err, result, errmsg) {
    if (err) {
      self.e(toError('ENOTVALID', err, 400), errmsg);
    }

    if (self.errors.length > 0) {
      self.e(toError('ENOTVALID', self.errors, 400), errmsg);
    }

    /* otherwise -- success */
    return result;
  };




  // The argv for these messaging functions
  var msgArgv = ARGV;

  self.loud = function(msg, ...rest) {
    return self.infoOut(2, msg, ...scrunch(rest));
  };

  /**
   * Logs [msg, ...rest] just like `i`, if the `feature` is not ignored.
   *
   * Allows doing console.log('asdfasf[1-X]', ...) debugging, but using DIAGs more
   * sophisticated feature set. Also allows ignoring all such items for a given
   * feature.
   *
   * Search for diag.tbd, dg.tbd, and/or any of the names.
   * Search for tbd\(.diagctx., for diagctx, with regex.
   *
   * @param {*} feature - All logs from a feature should have the same name.
   * @param {*} id      - All logs from a feature should have unique IDs. A filename-ish and number are good.
   * @param {*} msg_    - `msg` param like for `i`.
   * @param {*} rest    - `...rest` param like for `i`.
   * @returns
   */
  self.tbd = function(feature, id, msg_, ...rest) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.quiet) { return; }

    // List of ignored features

    // if (feature === 'diagctx')  { return; }
    if (':diagctx:'.indexOf(`:${feature}:`) !== -1)   { return; }

    const msg = _.compact([`${feature}-${id}`, msg_]).join('-');

    var stillNeedStandardLogging = true;
    if (self.logger && self.logger.tbd) {
      stillNeedStandardLogging = !self.logger.tbd(msg, ...scrunch(rest));
    }

    if (stillNeedStandardLogging) {
      if (self.stdoutIsDataOnly()) {
        return self.infoOut(2, msg, ...scrunch(rest));
      }
      return self.out(msg, ...scrunch(rest));
    }
  };

  self.tbd_if = function(test, feature, id, msg, ...rest) {
    if (!test) { return; }
    return self.tbd(feature, id, msg, ...scrunch(rest));
  };



  self.i = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.quiet) { return; }

    var stillNeedStandardLogging = true;
    if (self.logger) {
      stillNeedStandardLogging = !self.logger.i(msg, ...scrunch(rest));
    }

    if (stillNeedStandardLogging) {
      if (self.stdoutIsDataOnly()) {
        return self.infoOut(2, msg, ...scrunch(rest));
      }
      return self.out(msg, ...scrunch(rest));
    }
  };

  self.i_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.i(msg, ...scrunch(rest));
  };

  self.d = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.quiet)  { return; }
    if (!msgArgv.debug) { return; }

    var stillNeedStandardLogging = true;
    if (self.logger) {
      stillNeedStandardLogging = !self.logger.d(msg, ...scrunch(rest));
    }

    if (stillNeedStandardLogging) {
      if (self.stdoutIsDataOnly()) {
        return self.infoOut(2, msg, ...scrunch(rest));
      }
      return self.out(msg, ...scrunch(rest));
    }
  };

  self.d_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.d(msg, ...scrunch(rest));
  };

  self.v = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.quiet)    { return; }
    if (!msgArgv.verbose) { return; }

    var stillNeedStandardLogging = true;
    if (self.logger) {
      stillNeedStandardLogging = !self.logger.v(msg, ...scrunch(rest));
    }

    if (stillNeedStandardLogging) {
      if (self.stdoutIsDataOnly()) {
        return self.infoOut(2, msg, ...scrunch(rest));
      }
      return self.out(msg, ...scrunch(rest));
    }
  };

  self.v_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.v(msg, ...scrunch(rest));
  };

  function showBigAnnoyingMessage(err, msg, options, ...rest) {
    const {banner='-----', stream='error'} = options || {};

    var msg_ = `\n\n     ${banner}     ${banner}     ${msg}     ${banner}     ${banner}\n\n`.split('\n');
    console[stream](...logged(err, msg_, ...rest));
  }

  self.w = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.quiet)    { return; }

    // TODO: `quiet` in this context should mean that the active developer doesnt want to be bugged
    if (msgArgv.quiet && activeDevelopment())    { return; }

    var stillNeedStandardLogging = true;
    if (self.logger) {
      stillNeedStandardLogging = !self.logger.w(msg, ...rest);
    }

    if (stillNeedStandardLogging) {
      showBigAnnoyingMessage(null, msg, {banner: '#####', stream: 'log'}, ...rest);
      // var msg_ = `\n\n     #####     #####     ${msg}     #####     #####\n\n`;
      // console.log(...logged(msg_, ...rest));

      if (fastFail()) {
        throw(new Error(`FastFail warning ${msg}`));
      } else if (warnStack()) {
        console.warn(`Warning ${msg}`, new Error(`Warning ${msg}`).stack);
      }
    }
  };

  self.w_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.w(msg, ...rest);
  };

  // TODO: This needs a lot of work.
  self.e = function(err, msg_, ...rest) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);

    const msg = msg_ || _.isString(err) ? err : msg_;

    var stillNeedStandardLogging = true;
    if (self.logger) {
      stillNeedStandardLogging = !self.logger.e(err, msg, ...rest);
    }

    if (stillNeedStandardLogging) {
      showBigAnnoyingMessage(err, msg, {banner: '!!!!!!!!!!'}, ...rest);

      if (fastFail()) {
        throw(new Error(`FastFail warning ${msg}`));
      } else if (warnStack()) {
        console.warn(`Warning ${msg}`, new Error(`Warning ${msg}`).stack);
      }
    }
  };

  self.assert = self.e_if = function(test, err, msg, ...rest) {
    if (!test) { return; }
    return self.e(err, msg, ...rest);
  };

  self.id = function(msg, i_params, v_params) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.debug) {
      return self.d(msg, {...(i_params ||{}), ...v_params});
    }

    return self.i(msg, i_params);
  };

  self.id_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.id(msg, ...rest);
  };

  self.iv = function(msg, i_params, v_params) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.verbose) {
      return self.v(msg, {...(i_params ||{}), ...v_params});
    }

    return self.i(msg, i_params);
  };

  self.iv_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.iv(msg, ...rest);
  };

  const logged = self.logged = function(msg, ...rest) {
    return sg.reduce(rest, [msg], (m, arg) => {
      return sg.ap(m, inspect(arg));
    });
  };

  /**
   * The worker function that sends the log message to the right output.
   *
   * @param {*} channel - 1 === stdout; otherwise, stderr
   * @param {*} msg
   * @param {*} rest
   * @returns
   */
  self._out_ = function(channel, msg, ...rest) {
    if (channel === 1) {
      console.log(...logged(msg, ...rest));
      return;
    }

    // TODO: Fix so channel means something
    console.error(...logged(msg, ...rest));
  };

  /**
   * Sends to stdout (an alias for self._out_(1, ...)
   *
   * @param {*} msg
   * @param {*} rest
   * @returns
   */
  self.out = function(msg, ...rest) {
    return self._out_(1, msg, ...rest);
  };

  /**
   *
   *
   * @param {*} channel
   * @param {*} msg
   * @param {*} rest
   * @returns
   */
  self.infoOut = function(channel, msg, ...rest) {
    if (!_.isNumber(channel))                   { return self.infoOut(2, ..._.compact([arguments[0], arguments[1], ...rest])); }
    return self._out_(channel, msg, ...rest);
  };

  /**
   * When using a CLI app, and piping from one utility to another, only meaningful data can
   * be sent to stdout. You cannot send messages or warnings, etc. Just data.
   *
   * @returns
   */
  self.stdoutIsDataOnly = function() {
    // TODO: Fix -- this is a property of the utility

    return ENV.at('SG_STDOUT_IS_DATA_ONLY');
  };

  /**
   * Get the argv param.
   *
   * @param {*} [args={}]
   * @returns
   */
  self.getArgv = function(args ={}) {
    return args.argv ||{};
  };

  // ---------- Helpers ----------
  self.inspect      = inspect;
  self.production   = production;
  self.prod         = production;
  self.development  = activeDevelopment;
  self.dev          = activeDevelopment;

  function production() {
    return process.env.NODE_ENV === 'production';
  }

  function activeDevelopment() {
    if (production())   { return false; }

    return ENV.at('ACTIVE_DEVELOPMENT');
  }

  function inspect(x, colors =true) {
    msgArgv = msgArgv || self.getArgv(ctorArgs);

    if (fancy()) {
      return util.inspect(x, {depth:null, colors});
    } else if (readable()) {
      return sg.safeJSONStringify(x, null, 2);
    }

    return sg.safeJSONStringify(x);
  }

  function fancy() {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.fancy)          { return true; }

    if (production())           { return false; }
    if (msgArgv.quiet)          { return false; }
    if (activeDevelopment())    { return true; }

    return msgArgv.verbose || msgArgv.debug;
  }

  // Multi-line but not colored (human-readable, but not fancy, but `jq` parsable)
  function readable() {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    if (msgArgv.readable)       { return true; }

    if (production())           { return false; }
    if (msgArgv.quiet)          { return false; }
    if (activeDevelopment())    { return true; }

    return msgArgv.verbose || msgArgv.debug;
  }

  function fastFail() {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    return ENV.at('SG_FAST_FAIL') ||  msgArgv.fastfail;
  }

  function warnStack() {
    msgArgv = msgArgv || self.getArgv(ctorArgs);
    return ENV.at('SG_WARN_STACK') || msgArgv.warnstack;
  }

}




function diagnostic(args) {
  if (args.context) {
    return fromContext(args);
  }

  return new Diagnostic(args);
}

function fromContext(args) {

  var   diag;
  // diag = getContextItem(args.context, 'diag');

  // if (!diag) {
    diag = new Diagnostic(args);

  //   setContextItem(args.context, 'diag', diag);
  // }

  return diag;
}




function getContextItem(context, name) {
  if (!context || !name)      { return; }

  context.sgDiagnostic        = context.sgDiagnostic || {};
  return context.sgDiagnostic[name];
}

function setContextItem(context, name, item) {

  context.sgDiagnostic        = context.sgDiagnostic || {};
  context.sgDiagnostic[name]  = item;
  return item;
}



function getCallback(args ={}) {
  return args.callback;
}

