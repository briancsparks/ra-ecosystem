

const http                    = require('http');
const MongoClient             = require('mongodb').MongoClient;
const redisLib                = require('redis');

// ------------------------------------------------------------------------------------------------------------------
const main = function() {

  const port = 3000;

  const server = http.createServer((req, res) => {
    console.log(`Request for ${req.url}`);

    // Note: to test, use query={host:'localhost'}
    const query = {};
    // const query = {host:'localhost'};

    return testMongoDb(query, {}, (mongoErr, mongoResult) => {
      return testRedis(query, {}, (redisErr, redisResult) => {
        var   result = {};

        // Handle errors
        if (mongoErr || redisErr) {
          if (mongoErr)     { result = {...result, mongoErr}; }
          if (redisErr)     { result = {...result, redisErr}; }

          result = {...result, mongoResult, redisResult};
          result.ok = false;

          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // Success
        result = {...result, mongoResult, redisResult};
        result.ok = mongoResult.ok && redisResult.ok;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      });
    });
  });

  server.listen(port, () => {
    console.log(`Server running at port: ${port}`);
  });
};

// ------------------------------------------------------------------------------------------------------------------
module.exports.testMongoDb    =  testMongoDb;
module.exports._testMongoDb_  = _testMongoDb_;
module.exports.testRedis      =  testRedis;
module.exports._testRedis_    = _testRedis_;

// ------------------------------------------------------------------------------------------------------------------
var   skipMain = false;
if (process.argv[1].indexOf('run-anywhere') >= 0 && process.argv[2].toLowerCase() === 'invoke') {
  skipMain = true;
}

if (!skipMain) {
  main();
}

// ==================================================================================================================
// MongoDB
// ==================================================================================================================

// ------------------------------------------------------------------------------------------------------------------
/**
 * Test that MongoDb can be accessed.
 *
 * @param {Object} argv                                     - The typical argv object.
 * @param {string} [argv.dbHost=mongodb]                    - The DB's hostname.
 * @param {string} [argv.dbPort=27017]                      - The DB host's port.
 * @param {string} [argv.dbName=quicknettestcluster]        - The DB name.
 * @param {string} [argv.collection=quicknettestcluster]    - The collection name.
 * @param {Object} context                                  - The typical context object.
 * @param {function} callback                               - The typical callback param.
 *
 * @returns {undefined}
 */
function testMongoDb(argv, context, callback) {
  const dbHost            = argv.dbHost       || argv.host            || 'mongodb';
  const dbPort            = argv.port         || 27017;
  const dbName            = argv.dbName       || argv.db_name         || argv.name      || 'quicknettestcluster';
  const collection        = argv.collection   || argv.coll            || argv.c         || 'quicknettestcluster';

  return _testMongoDb_({dbHost, dbPort, dbName, collection}, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------
/**
 * Test that MongoDb can be accessed.
 *
 * @param {Object} argv                   - The typical argv object.
 * @param {string} argv.dbHost            - The DB's hostname.
 * @param {string} argv.dbPort            - The DB host's port.
 * @param {string} argv.dbName            - The DB name.
 * @param {string} argv.collection        - The collection name.
 * @param {Object} context                - The typical context object.
 * @param {function} callback             - The typical callback param.
 *
 * @returns {undefined}
 */
function _testMongoDb_({dbHost, dbPort, dbName, collection}, context, callback) {

  const url = `mongodb://${dbHost}:${dbPort}/${dbName}`;

  return MongoClient.connect(url, {useNewUrlParser:true}, (err, client) => {
    if (err) {
      console.error(`Mongo error calling connect`, {err});
      return callback(err);
    }

    const db    = client.db(dbName);
    const coll  = db.collection(collection);

    const query   = {quickNetCheckClusterId: 'quickNetCheckClusterId-zero'};
    const updates = {$inc:{count:1}};

    return coll.updateOne(query, updates, {upsert:true}, (err, receipt) => {
      client.close();

      if (err) {
        console.error(`Mongo error calling udateOne`, {err});
        return callback(err);
      }

      const {result, modifiedCount, upsertedId, upsertedCount, matchedCount} = receipt;

      return callback(null, {result, modifiedCount, upsertedId, upsertedCount, matchedCount, ok:true});
    });
  });
}

// ==================================================================================================================
// Redis
// ==================================================================================================================

// ------------------------------------------------------------------------------------------------------------------
/**
 * Test that Redis can be accessed.
 *
 * @param {Object} argv                                     - The typical argv object.
 * @param {string} [argv.hostost=redis]                     - Redis hostname.
 * @param {string} [argv.port=6379]                         - Redis port.
 * @param {Object} context                                  - The typical context object.
 * @param {function} callback                               - The typical callback param.
 *
 * @returns {undefined}
 */
function testRedis(argv, context, callback) {

  const host  = argv.host || 'redis';
  const port  = argv.port || 6379;

  return _testRedis_({host, port}, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------
/**
 * Test that Redis can be accessed.
 *
 * @param {Object} argv                                     - The typical argv object.
 * @param {string} argv.hostost                             - Redis hostname.
 * @param {string} argv.port                                - Redis port.
 * @param {Object} context                                  - The typical context object.
 * @param {function} callback                               - The typical callback param.
 *
 * @returns {undefined}
 */
function _testRedis_({host, port}, context, callback) {

  const redis       = redisLib.createClient(port, host);
  var   quitCount   = 0;

  redis.on("error", (err, ...rest) => {
    console.error(`redis on error`, {err, rest});

    if (quitCount === 0) {
      redis.quit();
      quitCount += 1;
    }
  });

  return redis.set("quicknettestcluster:x", "quicknettestcluster", (err, receipt) => {
    if (quitCount === 0) {
      redis.quit();
      quitCount += 1;
    }

    if (err) {
      console.error(`redis error calling SET`, {err});
      return callback(err);
    }

    return callback(null, {receipt, ok:true});
  });
}

