
// -------------------------------------------------------------------------------------
//  requirements
//

const _                         = require('lodash');
const utils                     = require('../../utils');
const sg                        = utils.sg;
const MongoClient               = require('mongodb').MongoClient;
const { qm }                    = require('quick-merge');
const { registerSanityChecks }  = require('../sanity-checks');

const {
  getQuiet, raContext, inspect,
}                               = utils;

// -------------------------------------------------------------------------------------
//  Data
//

var   sanityChecks  = [];
var   xyzDbs        = {};


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
 * @param {*} collName the name of the collection
 * @param {*} context  the context from AWS
 * @param {*} dbName   the name of the DB
 * @returns The collection and a close function to call when done.
 */
const getXyzDb = async function(collName, context, dbName) {
  const quiet           = getQuiet(context || {});
  var   raCtx           = raContext(context);
  var   connections     = raCtx.dbs                     = raCtx.dbs                  || {};

  raCtx.now             = raCtx.now                                                  || new Date();

  // These two are returned
  var   close           = function(){};
  var   xyzDb           = connections[`${dbName}/${collName}`];

  if (!xyzDb) {
    let   dbHost        = process.env.db || process.env.SERVERASSIST_DB_IP || 'db';
    let   dbUrl         = `mongodb://${dbHost}:27017/${dbName}`;

    let   conn          = await MongoClient.connect(dbUrl, {useNewUrlParser:true});
    let   db            = conn.db(dbName);

    xyzDb               = raCtx.dbs[`${dbName}/${collName}`] = db.collection(collName);

    if (!quiet) console.log(`Giving out close for ${collName}`);
    close = function() {
      if (!quiet) console.log(`Closing for ${collName}`);
      conn.close();
    };
  }

  // Return the collection as a couple of different names as convienence to caller
  return {
    [`${collName}Db`]:    xyzDb,
    collection:           xyzDb,
    coll:                 xyzDb,
    close
  };
};


exports.getGetXyzDb = function(dbname, collname) {

  xyzDbs[dbname] = xyzDbs[dbname] || {};

  if (!xyzDbs[dbname][collname]) {

    xyzDbs[dbname][collname] = function(context) {
      return getXyzDb(collname, context, dbname);
    };
  }

  return xyzDbs[dbname][collname];
};


const queryCursor = exports.queryCursor = function(xyzDb, context, ...argvs) {
  const quiet           = getQuiet(context);

  var argv = _.reduce(argvs, (argv, arg) => {
    if (typeof arg === 'string')    { return qm(argv, {query:{ [arg]: {$exists:true}}}); }

    return qm(argv, arg);
  }, {});

  if (!quiet) console.error(`queryCursor`, inspect({argv}));

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

exports.updatify = function(updates_, query, context) {

  const now     = getNow(context);
  var   updates = qm(updates_, {$set:getIds(query)});

  return qm(updates, {
    $set: {
      mtime:    now
    },
    $setOnInsert: {
      ctime:    now
    }
  });
};

exports.fixParams = function(arr) {
  if (!_.isArray(arr))    { return exports.fixParams([arr])[0]; }

  const result = arr.map(x => {
    return _.reduce(x, (m,v,k) => {
      return {...m, [k]: fixValue(v)};
    }, {});
  });


  return result;
}



/**
 * results from MongoDB are huge objects. Makes them small.
 *
 * @param {*} result
 */
exports.smResult = exports.smReceipt = exports.smDbResult = exports.smDbReceipt = function(result) {
  return _.omit(result, 'message', 'connection');
};

// -------------------------------------------------------------------------------------
//  Helper functions
//

function getNow(context = {}) {
  return (context.ntlctx || {}).now   || new Date();
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


