
/**
 * @file
 *
 * Does the warmup function.
 *
 * The warmup function is to call the target just like a reverse proxy,
 * and cache the result as normal, but on a cache hit, to immediately return
 * the result from the cache, but still call the target function, and when it
 * returns, update the cache. The cache items generally have a much longer
 * TTL than the warmup time.
 *
 */

module.exports.mkWarmup = mkWarmup;

// ----------------------------------------------------------------------------------------------------------------------------
function mkWarmup(options, handler, handle) {

  // For example, handler.getKey(), options.ttl

  return function(argv, context, callback) {

    // TODO: Use something like this
    // const sendResult_ = _.once(sendResult);

    // TODO: Read from cache - something like this
    // readFromCache(argv, context, function(err, data, ...rest) {
    //   return sendResult_(err, data, ...rest);
    // });

    return handle(argv, context, function(err, data, ...rest) {
      return sendResult(err, data, ...rest);
    });

    function sendResult(err, data, ...rest) {
      return callback(err, data, ...rest);
    }
  };
}
