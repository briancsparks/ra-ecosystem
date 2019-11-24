

// Redis
module.exports.redisEmit = function () {
  const redis = require('redis').createClient();

  const rkey = `sgemit:emitted`;

  var   numOutstanding = 0;

  return [emit, closeEmit];

  function emit(data) {
    numOutstanding += 1;
    redis.rpush(rkey, JSON.stringify(data), (err, receipt) => {
      console.error(`redisemit rpush`, {err, receipt});
      numOutstanding -= 1;
    });
  }

  function closeEmit() {
    if (numOutstanding > 0) {
      return setTimeout(closeEmit, 10);
    }
    console.error(`redisemit close`);
    redis.quit();
  }
};

// Mongo
module.exports.mongoEmit = function () {
  const MongoClient   = require('mongodb').MongoClient;
  var   client        = null;
  var   db, coll;

  const dbname    = `sgemit-emitted`;
  const collname  = `sgemit-emittedcoll`;

  var   numOutstanding = 0;

  return [emit, closeEmit];

  function emit(data) {

    numOutstanding += 1;
    return connect((err, client, db, coll) => {
      return coll.insertMany(arrayify(data), (err, result) => {
        numOutstanding -= 1;
      });
    });
  }

  function closeEmit() {
    if (numOutstanding > 0) {
      return setTimeout(closeEmit, 10);
    }

    client.close();
  }

  function connect(callback) {
    if (client) {
      return callback(null, client, db, coll);
    }

    return MongoClient.connect(`mongodb://localhost:27017`, {useNewUrlParser:true}, (err, client) => {

      db    = client.db(dbname);
      coll  = db.collection(collname);

      return callback(err, client, db, coll);
    });
  }
};

function arrayify(x) {
  if (Array.isArray(x)) { return x; }
  return [x];
}
