
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;
const {
  extracts
}                             = sg;


var   lib={params:{}};

// -------------------------------------------------------------------------------------
//  Data
//

const debugKeys   = lib.params.debugKeys  = ['debug', 'verbose', 'ddebug', 'vverbose', 'forceSilent', 'silent'];
const systemKeys  = lib.params.systemKeys = ['warnstack', 'fastfail' ];


// -------------------------------------------------------------------------------------
//  Functions
//


// ---------- For argv ----------
lib.omitDebug = function(obj) {
  return _.omit(obj, ...debugKeys);
};

lib.omitSystem = function(obj) {
  return _.omit(obj, ...systemKeys);
};

lib.pickDebug = function(obj) {
  return _.pick(obj, ...debugKeys);
};

lib.pickParams = function(obj) {
  return _.omit(obj, '_', ...debugKeys, ...systemKeys);
};

lib.extractDebug = function(obj) {
  var   result = extracts(obj, ...debugKeys);

  if (result.verbose)       { result.debug  = result.verbose; }
  if (result.vverbose)      { result.ddebug = result.vverbose; }

  return result;
};

lib.extractParams = function(obj) {
  const params = lib.pickParams(obj);

  return extracts(obj, ...Object.keys(params));
};



// -------------------------------------------------------------------------------------
// exports
//

_.each(lib, (v,k) => {
  module.exports[k] = v;
});

// -------------------------------------------------------------------------------------
//  Helper Functions
//


