
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

// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


