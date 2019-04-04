
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;
const utils                     = require('../utils');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.ensureContext = function(req, res, contextDottedPath, eventDottedPath, initialParams={}) {
  if (res.runAnywhere) {
    let ractx   = res.runAnywhere;
    let context = ractx.context;
    let event   = ractx.event;

    return {ractx, context, event};
  }

  var ractx, context = sg.deref(req, contextDottedPath), event = sg.deref(req, eventDottedPath);

  if (!res.runAnywhere) {
    ractx = {
      ARGV:   utils.getARGV(),
      req_url:  req.url,
      ...initialParams,
      current: {}
    };

    ractx.context         = context;
    ractx.event           = event;

    req.runAnywhere       = res.runAnywhere = ractx;
    context.runAnywhere   = ractx;
  }

  return exports.ensureContext(req, res, contextDottedPath, eventDottedPath, initialParams);
};

// Blantly stolen from quick-net

exports.mkResponse = function(code, req, res, err, result_, dbg) {
  var result = {code, ok:!err, ...sg.debugInfo(dbg)};

  if (!err) {
    result = {...result, ...(result_ || {})};
  }

  console.error(`${code} for ${req.url}`, sg.inspect({result, err}));

  if (sg.modes().debug) {
    result.error = err;
  }

  const strResult = JSON.stringify(result);
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);
};


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


