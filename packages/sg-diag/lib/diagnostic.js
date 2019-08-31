
const sg                      = require('sg0');
const { _ }                   = sg;
const { util }                = sg.libs;
const { toError }             = require('./error');

module.exports.Diagnostic = Diagnostic;
module.exports.diagnostic = diagnostic;

function Diagnostic(...args) {
  var   self    = this;

  self.DIAG     = {};
  self.options  = rootOptions(...args);
  self.errors   = null;

  // TODO: return args from argv, DIAG.usages
  self.args = function(fnName = '') {
    const argv    = getArgv(...args);
    const usages  = self.DIAG.usages || {};
    const usage   = usages[fnName]   || {};

    // Get all the data items
    var   result = sg.reduce(argv, {}, (m, v, k) => {
      if (!_.isFunction(v)) {
        return sg.kv(m, k, v);
      }

      return m;
    });

    // Handle aliases
    result = sg.reduce(usage.args, result, (m, arg, name) => {
      const aliases = (arg.aliases || '').split(',');
      _.each(aliases, alias => {

        if (alias in argv) {
          self.w_if(name in m, `Already have ${name}; adding alias ${alias}`);
          m[name] = argv[alias];
        }
      });

      return m;
    });

    return result;
  };

  self.addError = function(err) {
    if (!err) { return; }

    self.errors = self.errors || [];
    self.errors.push(err);

    return self.errors.length;
  };

  self.haveArgs = function(args) {
    _.each(args, (arg, name) => {
      if (sg.isnt(arg)) {
        self.addError(`Need arg "${name}"`);
      }
    });

    return !self.errors || self.errors.length === 0;
  };

  self.exit = function(err, ...results) {
    const callback    = getCallback(...args);

    // TODO: Check self.errors, callback, etc.
    if (sg.isnt(callback)) {
      if (self.errors && self.errors.length > 0) {
        // TODO: Make mechanism so we can throw, or return 'success' with error in the data

        throw toError('ENOTVALID', self.errors);
      }

      /* otherwise -- success */
      return results[0];
    }

    if (_.isFunction(callback)) {
      if (self.errors && self.errors.length > 0) {
        return callback(self.errors);
      }

      /* otherwise -- success */
      return callback(err, ...results);
    }

    // TODO: Not sure what here
    return results[0];
  };






  var msgArgv;

  self.i = function(msg, ...rest) {
    msgArgv = msgArgv || getArgv(...args);
    if (msgArgv.quiet) { return; }

    if (stdoutIsDataOnly()) {
      return self.infoOut(2, msg, ...rest);
    }
    return self.out(msg, ...rest);
  };

  self.i_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.i(msg, ...rest);
  };

  self.d = function(msg, ...rest) {
    msgArgv = msgArgv || getArgv(...args);
    if (msgArgv.quiet)  { return; }
    if (!msgArgv.debug) { return; }

    if (stdoutIsDataOnly()) {
      return self.infoOut(2, msg, ...rest);
    }
    return self.out(msg, ...rest);
  };

  self.d_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.d(msg, ...rest);
  };

  self.v = function(msg, ...rest) {
    msgArgv = msgArgv || getArgv(...args);
    if (msgArgv.quiet)    { return; }
    if (!msgArgv.verbose) { return; }

    if (stdoutIsDataOnly()) {
      return self.infoOut(2, msg, ...rest);
    }
    return self.out(msg, ...rest);
  };

  self.v_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.v(msg, ...rest);
  };

  self.w = function(msg, ...rest) {
    msgArgv = msgArgv || getArgv(...args);
    if (msgArgv.quiet)    { return; }

    var msg_ = `\n\n     #####     #####     ${msg}     #####     #####\n\n`;
    console.log(...logged(msg_, ...rest));

    if (fastFail()) {
      throw(new Error(`FastFail warning ${msg}`));
    } else if (warnStack()) {
      console.warn(`Warning ${msg}`, new Error(`Warning ${msg}`).stack);
    }
  };

  self.w_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.w(msg, ...rest);
  };

  self.iv = function(msg, i_params, v_params) {
    msgArgv = msgArgv || getArgv(...args);
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
    msgArgv = msgArgv || getArgv(...args);

    if (fancy()) {
      return util.inspect(x, {depth:null, colors});
    } else if (readable()) {
      return JSON.stringify(x, null, 2);
    }

    return JSON.stringify(x);
  }

  function fancy() {
    msgArgv = msgArgv || getArgv(...args);
    if (msgArgv.fancy)          { return true; }

    if (production())           { return false; }
    if (msgArgv.quiet)          { return false; }
    if (activeDevelopment())    { return true; }

    return msgArgv.verbose || msgArgv.debug;
  }

  // Multi-line but not colored (human-readable, but not fancy, but `jq` parsable)
  function readable() {
    msgArgv = msgArgv || getArgv(...args);
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

    msgArgv = msgArgv || getArgv(...args);
    return msgArgv.fastfail;
  }

  function warnStack() {
    if ('SG_WARN_STACK' in process.env) {
      return process.env.SG_WARN_STACK;
    }

    msgArgv = msgArgv || getArgv(...args);
    return msgArgv.warnstack;
  }

  function stdoutIsDataOnly() {
    // TODO: Fix

    return process.env.SG_STDOUT_IS_DATA_ONLY || false;
  }
}




function diagnostic(...args) {
  if (args.length === 1 && sg.objekt(args[0], {}).context) {
    return fromContext(...args);
  }

  return new Diagnostic(...args);
}

function fromContext(...args) {

  var   diag = sg.objekt(args[0].context, {}).sgDiagnostic;
  if (!diag) {
    diag = new Diagnostic(...args);

    args[0].context.sgDiagnostic = diag;
  }
  return diag;
}


function getArgv(...args) {
  return args[0] && args[0].argv;
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
