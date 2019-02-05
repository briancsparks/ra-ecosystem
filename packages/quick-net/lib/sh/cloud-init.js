
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const _                       = ra.get3rdPartyLib('lodash');
const script                  = require('./script');

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.ubuntuLtsUserData = function(options_, ...args) {
  var   options = options_ || {};

  options.distro   = options.distro     || 'ubuntu';
  options.version  = options.version    || '16.04';

  return script.script(options, ...args);
};

// -------------------------------------------------------------------------------------
//  Helper Functions
//


