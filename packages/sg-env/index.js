/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const sg                      = require('@sg0/sg-smart-value');

/**
 * @file
 *
 */

// -------------------------------------------------------------------------------------
// exports
//

module.exports.ENV          = ENV;
module.exports.smartValue   = sg.smartValue;

// -------------------------------------------------------------------------------------
//  Functions
//

function ENV(...args) {
  if (!(this instanceof ENV))     { return new ENV(...args); }

  var   self = this;

  self.at = function(name) {
    if (name in process.env)      { return sg.smartValue(process.env[name]); }
  };

  self.lc = function(name) {
    if (name in process.env)      { return process.env[name].toLowerCase(); }
  };

  self.UC = function(name) {
    if (name in process.env)      { return process.env[name].toUpperCase(); }
  };
}

