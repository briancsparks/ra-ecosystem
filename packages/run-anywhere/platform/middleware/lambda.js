
/**
 * @file
 *
 * Calls a lambda function.
 *
 */

module.exports.mkInvokeLambda = mkInvokeLambda;

// ----------------------------------------------------------------------------------------------------------------------------
function mkInvokeLambda(options, handler, lambdaName) {

  // For example, handler.getKey(), options.ttl

  return function(argv, context, callback) {
    // ... call lambda, send result, use lambdaName
    return callback(null, {});
  };
}
