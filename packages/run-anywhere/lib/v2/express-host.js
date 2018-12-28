
// -------------------------------------------------------------------------------------
//  requirements
//

const { qm }                  = require('quick-merge');
const cleanEnv                = require('step-forward').libPower.cleanEnv;
const {
  isAws
}                             = require('../utils');
const {
  getXyzDb
}                             = require('../lib/db/db-util');

// -------------------------------------------------------------------------------------
//  Data
//
const collNames               = 'clients,sessions,users,telemetry,attrstream,logs'.split(',');
const dbName                  = process.env.DB_NAME || 'ntl';




// -------------------------------------------------------------------------------------
//  Functions
//

/**
 *  Setup middleware for the hosting environment.
 *
 * @param {*} app
 */
exports.hookIntoHost = function(app) {
  if (isAws()) {
    const awsServerlessExpressMiddleware  = require('aws-serverless-express/middleware');
    app.use(awsServerlessExpressMiddleware.eventContext());
  } else {
    app.use(netlabContextMw());
  }
};

/**
 *  Calls Node.js listen function unless on Lambda, where Lambda will listen on a
 *  domain socket for us.
 *
 * @param {*} app
 * @param {*} port
 * @returns
 */
exports.listen = function(app, port_) {
  // console.error(`host listening`, {port_, env:cleanEnv(), argv:process.argv});
  // console.log(`host listening`, {port_, env:cleanEnv(), argv:process.argv});

  if (!isAws()) {
    const port  = getPort(port_);
    if (port <= 0)  { console.log(`Not starting server`); return; }

    app.listen(port, () => {
      console.log(`Server is listening on ${port}`);
    });
  }
};

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
 *  Provides middleware for Netlab.
 *
 *  * Get DB connections at startup, and share in each request, so we dont have to
 *    open and close the DB connection all the time, but also allowing the code
 *    to get DB connections whenever needed in the case of something like Lamba
 *
 * @returns
 */
function netlabContextMw() {
  var   netlabApp = {context:{}};

  // We grab connections to the DB here, so we dont have to close the DB after
  // every request.

  var   collections = {};
  var   closes      = {};

  collNames.forEach(collName => {
    const { coll, close } = getXyzDb(collName, netlabApp.context, dbName);

    collections[collName] = coll;
    closes[collName]      = close;
  });


  // Hook into the request/response stream -- the prototypical express.js middleware pattern
  return function(req, res, next) {

    req.netlabApp = qm(req.netlabApp, netlabApp);

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

