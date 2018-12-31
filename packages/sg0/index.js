
/**
 * @file
 */

var _                         = require('lodash');
var util                      = require('util');

var   sg = {};

/**
 * Returns an inspected object.
 *
 * @param {*} x
 * @param {*} colors
 * @returns
 */
sg.inspect = function(x, colors) {
  return util.inspect(x, {depth:null, colors: colors || false});
};





// Export functions
_.each(sg, function(fn, name) {
  exports[name] = sg[name];
});
