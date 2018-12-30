
/**
 *
 */

// -------------------------------------------------------------------------------------
//  requirements
//

const _                       = require('lodash');
const modSquad                = require('./v2/mod-squad');

const mod                     = modSquad.modSquad(module);

// var sg                  = require('sgsg');
// var _                   = sg._;

// -------------------------------------------------------------------------------------
//  Data
//
var libErrorHandlers = {};
var libConsole  = libErrorHandlers.console = {};
var libMongo    = libErrorHandlers.mongo   = {};
var libSns      = libErrorHandlers.sns     = {};


// -------------------------------------------------------------------------------------
//  Functions
//

libConsole.ErrorHandler = function() {
  var self = this;

  self.die = function(err, msg) {
    if (msg) {
      console.error(msg, err);
    } else {
      console.error(err);
    }
  };
};

libMongo.ErrorHandler = function() {
};

libSns.ErrorHandler = function() {
};

mod.xport({reportError: function(argv, context, callback) {

  return callback();
}});

mod.xport({reportWarning: function(argv, context, callback) {

  console.warn(`WWWWWWWWWWWWWWWWWWWWWWWW`);
  console.warn(...argv.log);

  return callback();
}});


_.each(libErrorHandlers, function(value, key) {
  exports[key] = value;
});

// -------------------------------------------------------------------------------------
//  Helper functions
//

