
const libRedis  = require('redis');

module.exports.mkConnection = mkConnection();

var redis;
function mkConnection() {

  var count = 0;

  return function() {
    if (!redis) {
      redis = libRedis.createClient(6379, '127.0.0.1');

      redis.on('error', function(err) {
        console.log("Error " + err);
      });
    }

    var close = function(){};

    // Get a connection
    if (count++ === 0) {
      close = function() {
        redis.quit();
      };
    }

    return [redis, close];
  };
}

