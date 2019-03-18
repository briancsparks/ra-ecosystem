
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;
const utils                   = require('../utils');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.ensureThreeContext = function(event_, context_, initialParams={}) {
  if (context_.runAnywhere) {
    let ractx   = context_.runAnywhere;
    let context = ractx.context;
    let event   = ractx.event;

    return {ractx, context, event};
  }

  var ractx;

  if (!context_.runAnywhere) {
    ractx = {
      ARGV:   utils.getARGV(),
      ...initialParams,
      current: {}
    };

    ractx.context           = context_;
    ractx.event             = event_;

    context_.runAnywhere    = ractx;
  }

  return exports.ensureThreeContext(event_, context_, initialParams);
};

exports.ensureThreeArgvContext = function(argv, context_, initialParams={}) {
  if (context_.runAnywhere) {
    let ractx   = context_.runAnywhere;
    let context = ractx.context;
    let event   = ractx.event     = argv;

    return {ractx, context, event};
  }

  var ractx;

  if (!context_.runAnywhere) {
    ractx = {
      ARGV:   utils.getARGV(),
      ...initialParams,
      current: {}
    };

    ractx.context           = context_;
    ractx.event             = argv;

    context_.runAnywhere    = ractx;
  }

  return exports.ensureThreeContext(argv, context_, initialParams);
};


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


