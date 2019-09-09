
const sg                      = require('sg0');
const { _ }                   = sg;
const { JsonSocketIoLogger }  = require('./logging-json-to-socket-io');
const Ajv                     = require('ajv');
const { util }                = sg.libs;
const { toError }             = require('./error');

module.exports.Diagnostic     = Diagnostic;
module.exports.diagnostic     = diagnostic;
module.exports.fromContext    = fromContext;
module.exports.setContextItem = setContextItem;
module.exports.getContextItem = getContextItem;

function Diagnostic(...args) {
  var   self    = this;

  self.DIAG     = {};
  self.bits     = {};
  self.options  = rootOptions(...args);
  self.errors   = [];

  self.logger   = null;
  self.close    = function(){};

  if (process.env.USE_SOCKETIO_DIAG) {
    self.logger   = new JsonSocketIoLogger();

    self.close = function() {
      self.logger.close();
    };
  }


  self.args = function(fnName) {
    const argv        = self.getArgv(...args);
    const currFnName  = self.DIAG.getCurrFnName()         || fnName   || '';

    // -------------------- Get argv elements --------------------

    // Get all the data from the `argv` that was passed in at the beginning of the fn
    var   argvOut = sg.reduce(argv, {}, (m, v, k) => {
      if (!_.isFunction(v)) {
        return sg.kv(m, k, sg.smartValue(v));
      }

      return m;
    });

    // Handle aliases
    const fnSpec = self.DIAG.getAliases() || {};
    argvOut = sg.reduce(fnSpec.args, argvOut, (m, arg, name) => {
      const aliases = (arg.aliases || '').split(',');
      _.each(aliases, alias => {

        if (alias in argv) {
          // self.w_if(name in m, `Already have ${name}; adding alias ${alias}`);
          m[name] = argv[alias];
        }
      });

      return m;
    });

    return argvOut;
  };

  self.haveArgs = function(inputArgs, computedArgs) {

    // See what's missing out of the caller-supplied args
    _.each(inputArgs, (arg, name) => {
      if (sg.isnt(arg)) {
        const msg = `Need arg "${name}"`;
        self.e(msg);
        self.errors.push(toError(msg));
      }
    });

    // See whats missing from the computed args
    _.each(computedArgs, (arg, name) => {
      if (sg.isnt(arg)) {
        const msg = `Could not determine "${name}"`;
        self.e(msg);
        self.errors.push(toError(msg));
      }
    });

    // Now we have the users proposed argv -- validate it
    const schema      = self.DIAG.getSchema()       || {};

    // TODO: Add {useDefaults:"empty", coerceTypes:true} once we can handle the data being changed
    var   validator   = new Ajv({allErrors: true, verbose: true});
    const valid       = validator.validate(schema, {...inputArgs, ...computedArgs});

    if (!valid) {
      self.e(validator.errorsText());
      if (self.getArgv(...args).verbose) {
        self.e(`Diagnostic.haveArgs`, ...validator.errors);
      }

      self.errors = [...self.errors, ...(validator.errors.map(e => toError(e)))];
      self.errors.push(toError(validator.errorsText()));
    }

    return self.errors.length === 0;
  };

  self.exit = function(err, ...results) {
    const callback    = getCallback(...args);

    // TODO: Check self.errors, callback, etc.
    if (sg.isnt(callback)) {
      if (self.errors.length > 0) {
        // TODO: Make mechanism so we can throw, or return 'success' with error in the data

        throw toError('ENOTVALID', self.errors);
      }

      /* otherwise -- success */
      return results[0];
    }

    if (_.isFunction(callback)) {
      if (self.errors.length > 0) {
        return callback(self.errors);
      }

      /* otherwise -- success */
      return callback(err, ...results);
    }

    // TODO: Not sure what here
    return results[0];
  };






  var msgArgv;

  self.loud = function(msg, ...rest) {
    return self.infoOut(2, msg, ...rest);
  };

  self.i = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(...args);
    if (msgArgv.quiet) { return; }

    var standard = true;
    if (self.logger) {
      standard = !self.logger.i(msg, ...rest);
    }

    if (standard) {
      if (self.stdoutIsDataOnly()) {
        return self.infoOut(2, msg, ...rest);
      }
      return self.out(msg, ...rest);
    }
  };

  self.i_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.i(msg, ...rest);
  };

  self.d = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(...args);
    if (msgArgv.quiet)  { return; }
    if (!msgArgv.debug) { return; }

    var standard = true;
    if (self.logger) {
      standard = !self.logger.d(msg, ...rest);
    }

    if (standard) {
      if (self.stdoutIsDataOnly()) {
        return self.infoOut(2, msg, ...rest);
      }
      return self.out(msg, ...rest);
    }
  };

  self.d_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.d(msg, ...rest);
  };

  self.v = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(...args);
    if (msgArgv.quiet)    { return; }
    if (!msgArgv.verbose) { return; }

    var standard = true;
    if (self.logger) {
      standard = !self.logger.v(msg, ...rest);
    }

    if (standard) {
      if (self.stdoutIsDataOnly()) {
        return self.infoOut(2, msg, ...rest);
      }
      return self.out(msg, ...rest);
    }
  };

  self.v_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.v(msg, ...rest);
  };

  function showBigAnnoyingMessage(msg, options, ...rest) {
    const {banner='-----', stream='error'} = options || {};

    var msg_ = `\n\n     ${banner}     ${banner}     ${msg}     ${banner}     ${banner}\n\n`;
    console[stream](...logged(msg_, ...rest));
  }

  self.w = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(...args);
    if (msgArgv.quiet)    { return; }

    var standard = true;
    if (self.logger) {
      standard = !self.logger.w(msg, ...rest);
    }

    if (standard) {
      showBigAnnoyingMessage(msg, {banner: '#####', stream: 'log'}, ...rest);
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
  self.e = function(msg, ...rest) {
    msgArgv = msgArgv || self.getArgv(...args);

    // TODO: `quiet` in this context should mean that the active developer doesnt want to be bugged
    if (msgArgv.quiet && activeDevelopment)    { return; }

    var standard = true;
    if (self.logger) {
      standard = !self.logger.e(msg, ...rest);
    }

    if (standard) {
      showBigAnnoyingMessage(msg, {banner: '!!!!!!!!!!'}, ...rest);

      if (fastFail()) {
        throw(new Error(`FastFail warning ${msg}`));
      } else if (warnStack()) {
        console.warn(`Warning ${msg}`, new Error(`Warning ${msg}`).stack);
      }
    }
  };

  self.assert = self.e_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.e(msg, ...rest);
  };

  self.iv = function(msg, i_params, v_params) {
    msgArgv = msgArgv || self.getArgv(...args);
    if (msgArgv.verbose) {
      return self.v(msg, {...i_params, ...v_params});
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

  self._out_ = function(channel, msg, ...rest) {
    if (channel === 1) {
      console.log(...logged(msg, ...rest));
      return;
    }

    // TODO: Fix so channel means something
    console.error(...logged(msg, ...rest));
  };

  self.out = function(msg, ...rest) {
    return self._out_(1, msg, ...rest);
  };

  self.infoOut = function(channel, msg, ...rest) {
    if (!_.isNumber(channel))                   { return self.infoOut(2, ..._.compact([arguments[0], arguments[1], ...rest])); }
    return self._out_(channel, msg, ...rest);
  };

  self.stdoutIsDataOnly = function() {
    // TODO: Fix

    return process.env.SG_STDOUT_IS_DATA_ONLY || false;
  };

  self.getArgv = function(...args) {
    return args[0] && args[0].argv;
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

    return process.env.ACTIVE_DEVELOPMENT;
  }

  function inspect(x, colors =true) {
    msgArgv = msgArgv || self.getArgv(...args);

    if (fancy()) {
      return util.inspect(x, {depth:null, colors});
    } else if (readable()) {
      return JSON.stringify(x, null, 2);
    }

    return JSON.stringify(x);
  }

  function fancy() {
    msgArgv = msgArgv || self.getArgv(...args);
    if (msgArgv.fancy)          { return true; }

    if (production())           { return false; }
    if (msgArgv.quiet)          { return false; }
    if (activeDevelopment())    { return true; }

    return msgArgv.verbose || msgArgv.debug;
  }

  // Multi-line but not colored (human-readable, but not fancy, but `jq` parsable)
  function readable() {
    msgArgv = msgArgv || self.getArgv(...args);
    if (msgArgv.readable)       { return true; }

    if (production())           { return false; }
    if (msgArgv.quiet)          { return false; }
    if (activeDevelopment())    { return true; }

    return msgArgv.verbose || msgArgv.debug;
  }

  function fastFail() {
    if ('SG_FAST_FAIL' in process.env) {
      return process.env.SG_FAST_FAIL;
    }

    msgArgv = msgArgv || self.getArgv(...args);
    return msgArgv.fastfail;
  }

  function warnStack() {
    if ('SG_WARN_STACK' in process.env) {
      return process.env.SG_WARN_STACK;
    }

    msgArgv = msgArgv || self.getArgv(...args);
    return msgArgv.warnstack;
  }

}




function diagnostic(...args) {
  if (args.length === 1 && sg.objekt(args[0], {}).context) {
    return fromContext(...args);
  }

  return new Diagnostic(...args);
}

function fromContext(...args) {

  var   sgDiagnostic  = sg.objekt(args[0].context, {}).sgDiagnostic || {};
  var   diag          = sgDiagnostic.diag;

  if (!diag) {
    diag = new Diagnostic(...args);

    setContextItem(args[0].context, 'diag', diag);
  }

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



function getCallback(...args) {
  return args[0] && args[0].callback;
}

function rootOptions(...args) {
  var   parent  = null;
  var   options = null;

  if (args[0] instanceof Diagnostic) {
    parent  = args[0];
    options = _.extend({}, parent.options);
  } else {
    options  = args[0] || {};
  }

  return options;
}
