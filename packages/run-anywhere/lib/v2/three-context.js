
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

exports.ensureThreeContext = function(context_, initialParams={}) {
  if (context_.runAnywhere) {
    let ractx   = context_.runAnywhere;
    let context = ractx.context;
    let event   = ractx.event;

    return {ractx, context, event};
  }

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


