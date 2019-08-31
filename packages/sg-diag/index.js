
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;

const sgDiagnostic            = require('./lib/diagnostic');
const sgCheck                 = require('./lib/check');
const sgParams                = require('./lib/params');


// -------------------------------------------------------------------------------------
//  Data
//


// -------------------------------------------------------------------------------------
//  Functions
//

module.exports.DIAG_ = function(mod) {
  // sg.elog(`DIAG`, {mod:sg.keys(mod)});
  // const {id, path, filename, paths} = mod;
  // sg.elog(`DIAG`, {id, path, filename, paths});

  var   self = this;

  self.usages = {};

  var   modFilename = mod.filename;
  var   modDirname  = mod.path;

  self.usage = function(options ={}) {
    self.usages = _.extend({}, self.usages, options);
  };

  self.diagnostic = function(...args) {
    var diag = sgDiagnostic.diagnostic(...args);

    // TODO: stuff diag with info

    diag.DIAG = self;
    return diag;
  };

};

module.exports.DIAG = function(...args) {
  return new module.exports.DIAG_(...args);
};


// -------------------------------------------------------------------------------------
// exports
//

module.exports.Diagnostic = sgDiagnostic.Diagnostic;
module.exports.diagnostic = sgDiagnostic.diagnostic;

_.each(sgCheck,  xport_it);
_.each(sgParams, xport_it);

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function xport_it(v,k) {
  module.exports[k] = v;
}
