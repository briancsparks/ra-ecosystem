if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

// -------------------------------------------------------------------------------------
//  requirements
//
const _                         = require('lodash');
const utils                     = require('../../utils');
const sg                        = utils.sg;
const redisLib                  = require('redis');
const wrapped                   = require('../wrapped');

const {
  getQuiet, getVerbose, raContext,
}                               = utils;

// -------------------------------------------------------------------------------------
//  Data
//


const redisPort               = 6379;
const redisHost               = 'redis';

// -------------------------------------------------------------------------------------
//  Functions
//

/**
 * Gets a Redis connection.
 *
 * The one big issue that comes up when you do `ra invoke ...` is that the individual function that is
 * invoked might need to access Redis (or some other closable resource.) In that case it needs to open,
 * perform operations, and then close cleanly. But when inside the larger app, it should not do the
 * open or close operation.
 *
 * This function allows the individual ra-invokable function to do the open/OP/close pattern, but if
 * the containing app has already setup the DB, then the function's open and close are noops.
 *
 * @param {Object} context  - The run-anywhere context object.
 *
 * @returns {Object}        - The Redis object, and the associated close function.
 */
exports.getRedis = function(context) {
  const quiet           = getQuiet(context || {});
  const verbose         = getVerbose(context);
  var   raCtx           = raContext(context);
  var   redis           = raCtx.redis;

  var   close           = function(){};

  if (process.env.NO_REDIS) {
    return {redis:{}, close};
  }

  if (!redis) {
    redis               = redisLib.createClient(redisPort, redisHost);
    raCtx.redis         = redis;

    if (verbose || process.env.SHOW_CONNECTION_CLOSES) console.log(`Giving out redis close`);
    close = function() {
      if (verbose || process.env.SHOW_CONNECTION_CLOSES) console.log(`Closing redis`);
      redis.quit();
    };
  }

  return {
    redis,
    close
  };
};

exports.redisFns = wrapped.mkFns;

// -------------------------------------------------------------------------------------
//  Helper functions
//

