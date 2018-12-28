
// -------------------------------------------------------------------------------------
//  requirements
//
const _                         = require('lodash');
const utils                     = require('../../utils');
const sg                        = utils.sg;
const redisLib                  = require('redis');
const { registerSanityChecks }  = require('../sanity-checks');

const {
  getQuiet, raContext, inspect,
}                               = utils;

// -------------------------------------------------------------------------------------
//  Data
//

var   sanityChecks            = [];

const redisPort               = process.env.redis_port  || process.env.REDIS_PORT || 6379;
const redisHost               = process.env.redis       || process.env.REDIS;

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
 * @param {*} context
 * @returns
 */
exports.getRedis = function(context) {
  const quiet           = getQuiet(context || {});
  var   raCtx           = raContext(context);
  var   redis           = raCtx.redis;

  var   close           = function(){};

  if (!redis) {
    redis               = redisLib.createClient(redisPort, redisHost);
    raCtx.redis         = redis;

    if (!quiet) console.log(`Giving out redis close`);
    close = function() {
      if (!quiet) console.log(`Closing redis`);
      redis.quit();
    };
  }

  return {
    redis,
    close
  };
};
sanityChecks.push(async function({assert, ...context}) {
  const { redis, close } = await exports.getRedis(context);
  close();

  return `redis_close()`;
});

// -------------------------------------------------------------------------------------
//  Helper functions
//

registerSanityChecks(module, __filename, sanityChecks);
