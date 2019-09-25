
const sg                      = require('sg0');

// Forced means the caller wants `forced` and only `forced` to be returned. (No favors.)

// Server-side error
module.exports._500 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 500,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

// Not Implemented
module.exports._501 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 501,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

// Bad Gateway
module.exports._502 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 502,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

// Service Unavailable
module.exports._503 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 503,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

// Gateway Timeout
module.exports._504 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 504,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};


