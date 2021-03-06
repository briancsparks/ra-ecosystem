
const sg                      = require('sg0');

// Forced means the caller wants `forced` and only `forced` to be returned. (No favors.)
module.exports._400 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 400,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

// Unauthorized -- might succeed if client authenticates
module.exports._401 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 401,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

// Forbidden
module.exports._403 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 403,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

module.exports._404 = function(resp, dbg, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : false,
      httpCode  : 404,
      debug     : sg.debugInfo(dbg),
    };
  }

  return [null, {...extra, ...payload}];
};

