
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.ensureContext = function(req, res, initialParams={}) {
  var ractx, context;

  if (!res.runAnywhere) {
    ractx = {
      req_url:  req.url,
      ...initialParams,
      current: {}
    };

    ractx.context     = ractx.context || sg.deref(req, `apiGateway.context`);
    ractx.event       = ractx.event   || sg.deref(req, `apiGateway.event`);

    req.runAnywhere   = res.runAnywhere = ractx;
  }

  ractx     = res.runAnywhere;
  context   = ractx.context;

  return {ractx, context};
};

// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


