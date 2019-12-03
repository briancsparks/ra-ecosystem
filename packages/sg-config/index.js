/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

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
  var configuration = new Configuration(...args);

  return function(key, callback) {
    return configuration.value(key, callback);
  };
};

_.each(sg, (v,k) => {
  exports[k] = v;
});



// -------------------------------------------------------------------------------------
//  Helper Functions
//

function Config(...configs) {
  return qmResolve(...configs);
}

function Configuration(...args) {
  if (!(this instanceof Configuration))   { return new Configuration(...args); }
  var self      = this;
  var rootName  = args[0];

  self.rootTable = {};

  // Read the root table
  readRootTable(...args);

  self.value = function(key, callback) {
    const ENV_KEY = `config_${rootName}_${key}`.toUpperCase();
    return callback(null, process.env[ENV_KEY]);
  };

  function readRootTable(...args) {
    var [argv, ...rest] = args[0];
  }

  function readRootTableFromName(name) {
  }
}


