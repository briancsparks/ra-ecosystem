
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const _                         = require('lodash');
const utils                     = require('../../utils');
const sg                        = utils.sg;
const util                      = require('util');
const MongoClient               = require('mongodb').MongoClient;
const ra                        = require('../mod-squad');
const dbUtils                   = require('./db-util');

const {
  getQuiet, getVerbose, raContext, inspect, qm, smResult,
}                               = utils;

const mod                       = ra.modSquad(module, `raCrud`);


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//


mod.xport({upsert: function(argv_, context, callback) {

  /*
    ra invoke lib\v2\db\crud.js upsert --arg=
  */

  var   argv = Object.assign(argv_);
  var   meta = sg.extract(argv, '__meta__');

  const { body, pathParams }  = meta.orig || {};
  const urlQuery              = (meta.orig || {}).query || {};
  const quiet                 = getQuiet(context);

  const { rax }   = ra.getContext(context, argv);
  return rax.iwrap2(function(abort, calling) {

    const dbname                  = rax.arg(argv, 'dbname,db', {required:true});
    const collname                = rax.arg(argv, 'collname,coll', {required:true});
    const dbHostname              = rax.arg(argv, 'hostname,host');
    const dbPortnum               = rax.arg(argv, 'port');
    const query                   = qm(urlQuery, body.query || {});
    const updates                 = _.omit(body, 'query');

    if (rax.argErrors())    { return rax.abort(); }

    const getXyzDb               = util.callbackify(dbUtils.getGetXyzDb(dbname, collname, dbHostname, dbPortnum));

    calling(`getXyzDb ${dbname}.${collname}`, {dbname, collname, dbHostname, dbPortnum});
    return getXyzDb(context, function(err, {xyzDb, close}) {
      if (!sg.ok(err, xyzDb, close))    { return abort(err, null, `getXyzDb fail`); }

      const updateOne   = util.callbackify(xyzDb.updateOne);

      const updates     = dbUtils.updatify(updates, query, context);
      return updateOne(query, updates, {upsert:true}, function(err, result) {
        if (!quiet)     { sg.elog(`updateOneSession`, sg.inspect({query, updates, result: smResult(result)})); }

        close();

        return callback(err, result);
      });
    });
  });
}});

mod.async({find: async function(argv_, context) {
  var   argv = Object.assign(argv_);
  var   meta = sg.extract(argv, '__meta__');

  // const { body, pathParams }  = meta.orig || {};
  // const urlQuery              = (meta.orig || {}).query || {};
  // const quiet                 = getQuiet(context);

  const dbname                  = argv.dbname   || process.env.DB_NAME;
  const collname                = argv.collname || argv.coll;
  const dbHostname              = argv.hostname;
  const dbPortnum               = argv.port;



  const getXyzDb                = dbUtils.getGetXyzDb(dbname, collname, dbHostname, dbPortnum);
  const { xyzDb, close }        = await getXyzDb(context);

  argv = qm({limit:5, sort:'mtime'}, argv);

  var   cursor = dbUtils.queryCursor(xyzDb, context, argv);
  const items  = await cursor.toArray();

  var   result = {items};

  if (items.length >= argv.limit) {
    result = qm(result, {next:{skip: (argv.skip || 0) + items.length}});
  }

  close();

  return result;
}});

// -------------------------------------------------------------------------------------
//  Helper Functions
//


