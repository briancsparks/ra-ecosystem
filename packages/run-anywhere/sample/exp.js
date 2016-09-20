
/**
 *  Export a function the run-anywhere way.
 */

var ra        = require('../ra');
var _         = require('sgsg')._;

var fooFunction = function(argv, context, callback) {
  return callback(null, {foo: argv.bar});
};

exports.foo = ra.exportFunction('foo', fooFunction, {});


