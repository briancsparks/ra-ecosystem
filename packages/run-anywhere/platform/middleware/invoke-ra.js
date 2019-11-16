
/**
 * @file
 *
 * Calls an RA function.
 *
 */

module.exports.mkInvokeRa = mkInvokeRa;

function mkInvokeRa(options, handler, fnName) {

  // For example, handler.getKey(), options.ttl

  return function(argv, context, callback) {
    // ... call ra
    return callback(null, {});
  };
}
