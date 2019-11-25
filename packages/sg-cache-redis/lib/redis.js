
const libRedis  = require('redis');

module.exports.mkConnection = mkConnection();

var redis;
var count = 0;

function mkConnection() {

  return function() {
    if (!redis) {
      redis = libRedis.createClient(6379, '127.0.0.1');

      redis.on('error', function(err) {
        console.log("Error " + err);
      });
    }

    var close = function(){ return --count; };

    // Get a connection
    if (count++ === 0) {
      close = function() {
        if (--count === 0) {
          redis.quit();
        }

        //TODO: assert
        return count;
      };
    }

    return [redis, close, count];
  };
}

