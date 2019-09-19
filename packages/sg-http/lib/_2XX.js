
const sg                      = require('sg0');

// Forced means the caller wants `forced` and only `forced` to be returned. (No favors.)
const _200 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : true,
      httpCode  : 200,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

module.exports._200 = _200;
