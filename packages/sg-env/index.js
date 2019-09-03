if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

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

module.exports.ENV = ENV;

// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//

function ENV(...args) {
  if (!(this instanceof ENV))     { return new ENV(...args); }

  var   self = this;

  self.at = function(name) {
    if (name in process.env)      { return process.env[name]; }
  };
}
