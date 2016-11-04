
/**
 *
 */

var sg                  = require('sgsg');
var _                   = sg._;

var libErrorHandlers = {};
var libConsole  = libErrorHandlers.console = {};
var libMongo    = libErrorHandlers.mongo   = {};
var libSns      = libErrorHandlers.sns     = {};

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


_.each(libErrorHandlers, function(value, key) {
  exports[key] = value;
});

