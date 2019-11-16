
/**
 * @file
 *
 * Does the warmup function, calling a lambda function as the target.
 *
 * The warmup function is to call the target just like a reverse proxy,
 * and cache the result as normal, but on a cache hit, to immediately return
 * the result from the cache, but still call the target function, and when it
 * returns, update the cache. The cache items generally have a much longer
 * TTL than the warmup time.
 *
 * This module actually does not do much, the warmup trickery is done in the
 * warmup middleware, we just invoke the lambda function and return the result.
 *
 */
const {mkWarmup}      = require('./warmup');

module.exports.mkWarmupLambda = mkWarmupLambda;

function mkWarmupLambda(options, handler, lambdaName) {

  // For example, handler.getKey(), options.ttl, options.lambdaName

  const warmup = mkWarmup({}, {}, callLambda);

  // Could just return warmup
  return function(argv, context, callback) {
    return warmup(argv, context, function(err, data, ...rest) {
      return callback(err, data, ...rest);
    });
  };

  // =======================================================================================

  function callLambda(argv, context, callback) {
    // ... call lambda, send result, use lambdaName
    return callback(null, {});
  }
}
