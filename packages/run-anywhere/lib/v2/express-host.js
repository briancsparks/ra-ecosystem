
// -------------------------------------------------------------------------------------
//  requirements
//

const _                         = require('lodash');
const utils                     = require('../utils');
const sg                        = utils.sg;
const { qm }                    = require('quick-merge');
const { registerSanityChecks }  = require('./sanity-checks');
const {
  isAws,
  cleanEnv,
}                               = utils;
const {
  getGetXyzDb
}                               = require('./db/db-util');

// -------------------------------------------------------------------------------------
//  Data
//

var   sanityChecks  = [];

// TODO: move out
const collNames               = 'clients,sessions,users,telemetry,attrstream,logs'.split(',');
const dbName                  = process.env.DB_NAME || 'ntl';

var   collections = {};
var   closes      = {};

var   server;



// -------------------------------------------------------------------------------------
//  Functions
//

/**
 *  Setup middleware for the hosting environment.
 *
 * @param {*} app
 */
exports.hookIntoHost = function(app) {

  // Use the middleware that is appropriate for the environment.
  if (isAws()) {
    const awsServerlessExpressMiddleware  = require('aws-serverless-express/middleware');
    app.use(awsServerlessExpressMiddleware.eventContext());
  } else {
    app.use(raContextMw());
  };

  // Setup
  app.runAnywhere = {
    listen: function(callback) {
      exports.listen(app, function(err, port) {
        return callback(err, port);
      });
    },

    close: function() {
      exports.close();
    }
  };
}

/**
 *  Calls Node.js listen function unless on Lambda, where Lambda will listen on a
 *  domain socket for us.
 *
 * @param {*} app
 * @param {*} port
 * @returns
 */
exports.listen = function(app, callback) {

  if (!isAws()) {
    const port  = getPort();
    if (port <= 0)  { console.log(`Not starting server`); return; }

    server = app.listen(port, () => {
      console.log(`Server is listening on ${port}`);
      if (_.isFunction(callback)) {
        return callback(null, port);
      }
    });

  } else {

    // Still need to call back
    if (_.isFunction(callback)) {
      return callback(null, -1);
    }
  }
};

/**
 * Closes dbs (MongoDB collections), and stops the server.
 *
 */
exports.close = function() {
  const keys = Object.keys(closes);

  _.each(keys, (key) => {
    const close = closes[key];
    if (_.isFunction(close)) {
      close();

      delete collections[key];
      delete closes[key];
    }
  });

  if (!isAws()) {
    server.close();
  }
};

// -------------------------------------------------------------------------------------
//  Helper functions
//

sanityChecks.push(async function({assert, ...context}) {
  getPort();

  return `getPort()`;
});

registerSanityChecks(module, __filename, sanityChecks);

// -------------------------------------------------------------------------------------
//  Helper functions
//

/**
 *  Allows the port to come from many places.
 *
 * @param {Number} port
 * @returns The port number
 */
function getPort(port_) {
  var port = port_ || process.env.PORT || require('minimist')(process.argv.slice(2)).port || 3000;
  return +port;
}


/**
 *  Provides middleware for run-anywhere's Express app.
 *
 *  * Get DB connections at startup, and share in each request, so we dont have to
 *    open and close the DB connection all the time, but also allowing the code
 *    to get DB connections whenever needed in the case of something like Lamba
 *
 * @returns
 */

 // TODO: should not create this unless needed
function raContextMw(collNames = []) {
  var   raApp = {context:{}};

  // We grab connections to the DB here, so we dont have to close the DB after
  // every request.

  // TODO: move out
  collNames = 'clients,sessions,users,telemetry,attrstream,logs'.split(',');
  collNames.forEach(collName => {
    const { coll, close } = getGetXyzDb(collName, dbName)(raApp.context);

    collections[collName] = coll;
    closes[collName]      = close;
  });


  // Hook into the request/response stream -- the prototypical express.js middleware pattern
  return function(req, res, next) {

    req.raApp = qm(req.raApp, raApp);

    // If you ever need to hook in and know when the request completes, see for an example:
    //    https://github.com/expressjs/compression/blob/master/index.js
    // and see `hook` below.

    return next();
  };
}

/**
 *  Example of how to do Express.js middleware when you need to do something at the end
 *  of the request.
 *
 * @param {ServerRequest} req
 * @param {ServerResponse} res
 * @param {function} next
 */
function hook(req, res, next) {
  var _end    = res.end;
  var _write  = res.write;
  //var _on     = res.on;

  res.write = function(chunk, encoding) {
    // ... other things

    // Call the original
    _write.call(this, chunk, encoding);

    // Note: in some cases, you have to restore the function:
    // res.write = _write;
  };

  res.end = function(chunk, encoding) {
    // ... other things

    // Call the original
    _end.call(this, chunk, encoding);

    // Note: in some cases, you have to restore the function:
    // res.end = _end;
  };

  return next();
}

