
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

exports.ensureContext = function(req, res) {
  var ractx, context;

  if (!res.runAnywhere) {
    ractx = {
      req_url:  req.url,
      current: {}
    };

    ractx.context = {runAnywhere: ractx};
    req.runAnywhere = res.runAnywhere = ractx;
  }

  ractx   = res.runAnywhere;
  context = ractx.context;
  return {ractx, context};
};

// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


