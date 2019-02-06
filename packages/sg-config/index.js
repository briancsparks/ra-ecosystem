
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const { qm, qmResolve }       = require('quick-merge');
var   sg                      = require('sg0');
const { _ }                   = sg._;
const path                    = require('path');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

/**
 * For when you are defining a config.
 *
 * @param {*} configs
 * @returns
 */
sg.config = function(...args) {
  return new Config(...args);
};

/**
 * For when you want to use/load a configuration.
 *
 * @param {*} dir
 * @param {*} file
 */
sg.configuration = function(...args) {
  return new Configuration(...args);
};

_.each(sg, (v,k) => {
  exports[k] = v;
});



// -------------------------------------------------------------------------------------
//  Helper Functions
//

function Config(...configs) {
  return qmResolve(...configs);
};

function Configuration(dir, name) {
  var json = require(path.join(dir, name)+'.json');

  return function(key) {
    return json[key];
  }
};


