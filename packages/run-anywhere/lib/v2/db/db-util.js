if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

// -------------------------------------------------------------------------------------
//  requirements
//

const _                         = require('lodash');
const utils                     = require('../../utils');
const sg                        = utils.sg;
const MongoClient               = require('mongodb').MongoClient;
// const { qm }                    = require('quick-merge');
const { registerSanityChecks }  = require('../sanity-checks');

const {
  getQuiet, getVerbose, raContext, inspect, qm
}                               = utils;

const ENV                       = sg.ENV();



// -------------------------------------------------------------------------------------
//  Data
//

var   sanityChecks        = [];
var   xyzDbs              = {};
var   theFakeDbCollection = {
};

var TheFakeCursor = function() {
  var self = this;

  self.toArray = async function() {
    return [];
  };
};




// -------------------------------------------------------------------------------------
//  Functions
//

/**
 * Gets a MongoDB collection
 *
 * The one big issue that comes up when you do `ra invoke ...` is that the individual function that is
 * invoked might need to access the DB (or some other closable resource.) In that case it needs to open,
 * perform CRUD operations, and then close cleanly. But when inside the larger app, it should not do the
 * open or close operation.
 *
 * This function allows the individual ra-invokable function to do the open/CRUD/close pattern, but if
 * the containing app has already setup the DB, then the function's open and close are noops.
 *
 * @param {String} collName     - the name of the collection
 * @param {Object} context      - the context from AWS
 * @param {String} dbName       - the name of the DB
 * @param {String} dbHostname   - the hostname for the DB instance
 * @param {String} dbPortnum    - the db instance port
 *
 * @returns {Object}            -  The collection and a close function to call when done.
 */
const getXyzDb = async function(collName, context, dbName, dbHostname, dbPortnum = 27017) {
  const quiet           = getQuiet(context || {});
  const verbose         = getVerbose(context);
  var   raCtx           = context.runAnywhere     = context.runAnywhere   || {};
  var   connections     = raCtx.dbs               = raCtx.dbs             || {};

  raCtx.now             = raCtx.now                                       || new Date();

  // These two are returned
  var   close           = function(){};
  var   xyzDb           = connections[`${dbName}/${collName}`];
  var   meaningfulClose = false;

  if (ENV.at('NO_MONGO')) {
    xyzDb = theFakeDbCollection;
  }

  if (!xyzDb) {
    let   dbHost        = dbHostname || process.env.db || process.env.SERVERASSIST_DB_IP || 'mongodb';
    let   dbUrl         = `mongodb://${dbHost}:${dbPortnum}/${dbName}`;

    let   conn          = await MongoClient.connect(dbUrl, {useNewUrlParser:true});
    let   db            = conn.db(dbName);

    xyzDb               = raCtx.dbs[`${dbName}/${collName}`] = db.collection(collName);

    if (verbose || process.env.SHOW_CONNECTION_CLOSES) console.log(`Giving out close for ${collName}`);
    close = function() {
      if (verbose || process.env.SHOW_CONNECTION_CLOSES) console.log(`Closing for ${collName}`);
      conn.close();
    };
    meaningfulClose = true;
  }

  // Return the collection as a couple of different names as convienence to caller
  return {
    [`${collName}Db`]:    xyzDb,
    collection:           xyzDb,
    coll:                 xyzDb,
    xyzDb,
    close,
    meaningfulClose
  };
};


/**
 * Gets a 'db' (actually a MongoDB collection, but called a DB in run-anywhere.)
 *
 * This function allows you to specify the db name and the collection name first
 * (they are probably known at startup time), and then the context later.
 *
 * This is the entry-point fot the getXyzDb() function, which does all the real
 * work.
 *
 * @param {String} dbname       - the name of the DB.
 * @param {String} collname     - the name of the collection.
 * @param {String} dbHostname   - the hostname for the DB instance
 * @param {String} dbPortnum    - the db instance port
 *
 * @returns {Object}            - The DB (collection)
 */
exports.getGetXyzDb = function(dbname, collname, dbHostname, dbPortnum = 27017) {

  xyzDbs[dbname] = xyzDbs[dbname] || {};

  if (!xyzDbs[dbname][collname]) {

    xyzDbs[dbname][collname] = function(context) {
      return getXyzDb(collname, context, dbname, dbHostname, dbPortnum);
    };
  }

  return xyzDbs[dbname][collname];
};

/**
 * Builds a MongoDB Cursor object in an easy way.
 *
 * @param {Object} xyzDb    - The DB (collection)
 * @param {Object} context  - The run-anywhere context
 * @param {Object[]} argvs  - Query arguments
 *
 * @returns {Object}        - The cursor object.
 */
const queryCursor = exports.queryCursor = function(xyzDb, context, ...argvs) {

  if (ENV.at('NO_MONGO')) {
    return new TheFakeCursor();
  }

  var argv = _.reduce(argvs, (argv, arg) => {
    if (typeof arg === 'string')    { return qm(argv, {query:{ [arg]: {$exists:true}}}); }

    return qm(argv, arg);
  }, {});

  // Default query is all
  var query       = argv.query          || {};
  var projection  = argv.projection;

  var cursor;

  if (projection) {
    cursor = xyzDb.find(query, {projection});
  } else {
    cursor = xyzDb.find(query);
  }

  // If we have no sort, yet, just use reverse-chrono
  if (argv.sort) {
    let sort = argv.sort;
    if (sort === true)              { sort = 'mtime'; }
    if (typeof sort === 'string')   { sort = {[sort]: -1}; }

    cursor = cursor.sort(sort);
  }

  // skip
  if (argv.skip) {
    cursor = cursor.skip(+argv.skip);
  }

  // limit
  if (argv.limit) {
    cursor = cursor.limit(+argv.limit);
  }

  return cursor;
};
sanityChecks.push(async function({assert, ...context}) {
  const { runsDb, close } = await exports.getGetXyzDb('sanitycheck', 'runs')(context);
  var   cursor = queryCursor(runsDb, context, {});
  close();

  return `db_close(),db_queryCursor()`;
});

/**
 * Builds a MongoDB Cursor object in an easy way.
 *
 * @param {Object}    xyzDb     - The DB (collection)
 * @param {Object}    context   - The run-anywhere context
 * @param {string[]}  queryKeys - Array of strings that are the top-level items in the collection (a key mirror)
 * @param {Object[]}  argvs     - Query arguments
 *
 * @returns {Object}        - The cursor object.
 */
const queryCursorEx = exports.queryCursorEx = function(xyzDb, context, queryKeys, ...argvs) {

  if (ENV.at('NO_MONGO')) {
    return new TheFakeCursor();
  }

  var argv = _.reduce(argvs, (argv, arg) => {
    if (typeof arg === 'string')    { return qm(argv, {query:{ [arg]: {$exists:true}}}); }

    var   result = {};
    const query = sg.reduce(arg, {}, (m,v,k) => {
      if (isIn(k, queryKeys)) {
        return sg.kv(m,k,v);
      }
      result[k] = v;
      return m;
    });

    return qm(argv, result, {query});
  }, {});

  // Default query is all
  var query       = argv.query          || {};
  var projection  = argv.projection;

  var cursor;

  // sg.elog(`queryCursorEx`, {query, queryKeys, argvs});
  sg.elog(`queryCursorEx`, {query});

  if (projection) {
    cursor = xyzDb.find(query, {projection});
  } else {
    cursor = xyzDb.find(query);
  }

  // If we have no sort, yet, just use reverse-chrono
  if (argv.sort) {
    let sort = argv.sort;
    if (sort === true)              { sort = 'mtime'; }
    if (typeof sort === 'string')   { sort = {[sort]: -1}; }

    cursor = cursor.sort(sort);
  }

  // skip
  if (argv.skip) {
    cursor = cursor.skip(+argv.skip);
  }

  // limit
  if (argv.limit) {
    cursor = cursor.limit(+argv.limit);
  }

  return cursor;
};

/**
 * When logging a result of querying, the list is usually big, and not meaningful to
 * the log, this function shortens the list of items to one, and shows the length.
 *
 * @param {*} result    - A result from a DB query.
 *
 * @returns {object}    - A smaller version
 */
exports.smQueryResult = function(result) {
  if (sg.isnt(result))  { return result; }
  return utils.smallItems(result, 'items');
};

/**
 * Does the mundane `mtime/ctime` on an object, and makes sure that IDs that are
 * on the query are put into the update.
 *
 * @param {*} updates_  - The updates
 * @param {*} query     - The query
 * @param {*} context   - The standard context object
 *
 * @returns {object}    - The receipt for the operation
 */
exports.updatify = function(updates_, query, context) {

  const now     = getNow(context);
  var   updates = qm(updates_, {$set:getIds(query)});

  const result = qm(updates, {
    $set: {
      mtime:    now
    },
    $setOnInsert: {
      ctime:    now
    }
  });

  // TODO: once qm handles Date()s, remove this
  result.$set.mtime           = now;
  result.$setOnInsert.ctime   = now;

  return result;
};

/**
 * Changes attributes on objects into more complex types, that you use a lot.
 *
 * ```js
 *  {
 *    clientId: "$re:/bo+ya/i"
 *  }
 * ```
 *
 * * re, regexp -- RegExp, like above.
 * * dt, date   -- a string that can be parsed by Date c-tor
 * * tm, time   -- a number (or all-numeric string) to use to make a Date from a time epoch
 *
 * @param {*} arr   - The input
 *
 * @returns {array}   - The result
 */
exports.fixParams = function(arr) {
  if (!_.isArray(arr))    { return exports.fixParams([arr])[0]; }

  const result = arr.map(x => {
    return _.reduce(x, (m,v,k) => {
      return {...m, [k]: fixValue(v)};
    }, {});
  });


  return result;
};



/**
 * results from MongoDB are huge objects. Makes them small.
 *
 * @param {*} result    - A result from a DB query.
 *
 * @returns {object}    - A smaller version
 */
exports.smResult = exports.smReceipt = exports.smDbResult = exports.smDbReceipt = function(result) {
  return _.omit(result, 'message', 'connection');
};

// -------------------------------------------------------------------------------------
//  Helper functions
//

function getNow(context = {}) {
  const result = (context.ntlctx || {}).now;
  if (result instanceof Date) {
    return result;
  }
  return new Date();
}

function getIds(query = {}) {
  return sg.reduce(query, {}, (m,v,k) => {
    if (k.toLowerCase().endsWith('id'))   { return sg.kv(m, k, v); }
    return m;
  });
}

var   specials = {};

function fixValue(v) {
  if (typeof v === 'string') {

    // Has it been marked as special?  {"clientId":"$re:/bo+ya/i"}
    let m = /^[$]([^:]+):(.*)$/.exec(v);
    if (m) {
      let name      = m[1];
      let strValue  = m[2];

      return fixValue({special:{name, strValue}});
    }

    return v;
  }

  if (typeof v !== 'object')    { return v; }

  if (v.special) {
    let { name, strValue } = v.special;
    let fn = specials[name];

    if (_.isFunction(fn)) {
      return fn(strValue);
    }
  }
}

specials.dt = specials.date = function(str) {
  return new Date(str);
};

specials.tm = specials.time = function(str) {
  const result = new Date();
  result.setTime(+str);
  return result;
};

specials.re = specials.regexp = function(str, flags) {
  const m = /^[/]([^/]+)[/]([a-z]*)$/.exec(str);
  if (m) {
    return specials.re(m[1], m[2] || '');
  }

  return new RegExp(str, flags || '');
};

registerSanityChecks(module, __filename, sanityChecks);

function isIn(key, obj) {
  if (key in obj)   { return true; }

  return sg.reduceFirst(obj, false, (m,v,k) => {
    if (k.startsWith(`${key}.`)) {
      return true;
    }
  });
}


