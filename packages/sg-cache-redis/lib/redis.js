
const sg0                     = require('sg0');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-diag'));
const libRedis                = require('redis');

const ENV                     = sg.ENV();
const DIAG                    = sg.DIAG(module);
const dg                      = DIAG.dg;

module.exports.mkConnection = mkmkConnection();

var redisHost;
var redisPort = 6379;

var redis;
var count = 0;

function mkmkConnection() {

  redisHost = ENV.host('redis');
  redisPort = ENV.port('redis')  || redisPort;

  dg.w_if(!redisHost,           `WNOREDISHOST_INENV`);
  dg.w_if(sg.isnt(redisPort),   `WNOREDISPORT_INENV`);

  return function() {
    redis = getLibRedis(redisPort, redisHost);

    var close = function(){ return --count; };

    // Get a connection
    if (count++ === 0) {
      close = function() {
        if (--count === 0) {
          redis.quit();
          redis = null;
        }

        //TODO: assert
        return count;
      };
    }

    return [redis, close, count];
  };


  // ==========================================================================================================================
  function getLibRedis(redisPort, redisHost) {
    if (redis) { return redis; }

    if (!ENV.at('NO_REDIS')) {
      redis = libRedis.createClient(redisPort, redisHost);

      redis.on('error', function(err) {
        console.log("Error " + err);
      });

      return redis;
    }

    // TODO: Backup should be to use localhost

    // We do not have an available redis server.
    const myRedis   = libRedis.createClient(6379, '127.0.0.1');
    var  theirRedis = {};

    theirRedis = Object.keys(myRedis).reduce((m, key) => {
      if (typeof myRedis[key] === 'function') {
        m[key] = function(...args) {
          const callback = sg._.last(args);
          if (typeof callback === 'function') {
            return callback('ENOIMPL');
          }
        };
      }

      return m;
    }, theirRedis);

    return theirRedis;
  }
}


