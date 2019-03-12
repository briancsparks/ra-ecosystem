
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

exports.ensureContext = function(context_, initialParams={}) {
  var ractx, context;

  if (!context_.runAnywhere) {
    ractx = {
      ...initialParams,
      current: {}
    };

    ractx.context           = context_;
    context_.runAnywhere    = ractx;
  }

  ractx   = context_.runAnywhere;
  context = ractx.context;

  return {ractx, context};
};


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


