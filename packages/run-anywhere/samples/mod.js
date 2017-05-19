
/**
 *  Example of run-anywhere-ifying a module.
 */

var ra        = require('../ra');

var abc = {};

abc.one = function(argv, context, callback) {
  return callback(null, {a1: argv.a1});
};

ra.exportMod(module, abc);

