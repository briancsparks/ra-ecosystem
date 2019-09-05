
const sg                      = require('sg0');
const { _ }                   = sg;

module.exports.Logger = Logger;
module.exports.logger = Logger;

function Logger(...args) {
  if (!(this instanceof Logger))    { return new Logger(...args); }


  self.i = function(msg, ...rest) {
    if (self.stdoutIsDataOnly()) {
      return self.infoOut(2, msg, ...rest);
    }
    return self.out(msg, ...rest);
  };

  self.d = function(msg, ...rest) {
    if (self.stdoutIsDataOnly()) {
      return self.infoOut(2, msg, ...rest);
    }
    return self.out(msg, ...rest);
  };

  self.v = function(msg, ...rest) {
    if (self.stdoutIsDataOnly()) {
      return self.infoOut(2, msg, ...rest);
    }
    return self.out(msg, ...rest);
  };

  function showBigAnnoyingMessage(msg, options, ...rest) {
    const {banner='-----', stream='error'} = options || {};

    var msg_ = `\n\n     ${banner}     ${banner}     ${msg}     ${banner}     ${banner}\n\n`;
    console[stream](...logged(msg_, ...rest));
  }

  self.w = function(msg, ...rest) {
    showBigAnnoyingMessage(msg, {banner: '#####', stream: 'log'}, ...rest);

    // if (fastFail()) {
    //   throw(new Error(`FastFail warning ${msg}`));
    // } else if (warnStack()) {
    //   console.warn(`Warning ${msg}`, new Error(`Warning ${msg}`).stack);
    // }
  };

  // TODO: This needs a lot of work.
  self.e = function(msg, ...rest) {
    const msgArgv = self.getArgv(...args);

    // TODO: `quiet` in this context should mean that the active developer doesnt want to be bugged
    if (msgArgv.quiet && self.activeDevelopment())    { return; }

    showBigAnnoyingMessage(msg, {banner: '!!!!!!!!!!'}, ...rest);

    // if (fastFail()) {
    //   throw(new Error(`FastFail warning ${msg}`));
    // } else if (warnStack()) {
    //   console.warn(`Warning ${msg}`, new Error(`Warning ${msg}`).stack);
    // }
  };

  self.iv = function(msg, i_params, v_params) {
    const msgArgv = self.getArgv(...args);
    if (msgArgv.verbose) {
      return self.v(msg, {...i_params, ...v_params});
    }

    return self.i(msg, i_params);
  };

  const logged = self.logged = function(msg, ...rest) {
    return sg.reduce(rest, [msg], (m, arg) => {
      return sg.ap(m, sg.inspect(arg));
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


  // =================================================================================================
  self.i_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.i(msg, ...rest);
  };

  self.d_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.d(msg, ...rest);
  };

  self.v_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.v(msg, ...rest);
  };

  self.w_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.w(msg, ...rest);
  };

  self.assert = self.e_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.e(msg, ...rest);
  };

  self.iv_if = function(test, msg, ...rest) {
    if (!test) { return; }
    return self.iv(msg, ...rest);
  };

}

