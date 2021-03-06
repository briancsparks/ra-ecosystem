if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);


/**
 * @file
 *
 * Use RA as the host for your Express app.
 *
 * Allows you to use your ra-ified functions in Express, and to use your Express
 * app in Lambda.
 */

// -------------------------------------------------------------------------------------
//  requirements
//

const sg                        = require('sg-config');
const _                         = require('lodash');
const utils                     = require('../utils');
const reqResContext             = require('./req-res-context');
const { qm }                    = require('quick-merge');
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

var   collections = {};
var   closes      = {};

var   server;

const binaryMimeTypes_ = [
	'application/octet-stream',
	'font/eot',
	'font/opentype',
	'font/otf',
	'image/jpeg',
	'image/png',
	'image/svg+xml'
];



// -------------------------------------------------------------------------------------
//  Functions
//

/**
 *  Setup middleware for the hosting environment.
 *
 * @param {*} app     - The express.js app object.
 * @param {*} name    - The app name.
 * @param {*} stage   - The name of the stage.
 * @param {*} ARGV    - The typical ARGV
 * @param {*} options - Additional options, like dbName.
 *
 * @returns {*}       - The handler function.
 */
exports.express_hookIntoHost = function(app, name, stage, ARGV, options = {}) {
  const { dbName, collNames, binaryMimeTypes } = options;

  utils.setARGV(ARGV);

  var   result;

  // Use the middleware that is appropriate for the environment.
  if (isAws()) {
    const awsServerlessExpress            = require('aws-serverless-express');
    const awsServerlessExpressMiddleware  = require('aws-serverless-express/middleware');

    app.use(awsServerlessExpressMiddleware.eventContext());
    const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes || binaryMimeTypes_);

    result = (event, context) => awsServerlessExpress.proxy(server, event, context);

  } else {
    app.use(exports.express_raMw(stage, ARGV, dbName, collNames));
  }

  // Setup
  app.runAnywhere = {
    stage,
    use: function(prefix_, ...rest) {
      const prefix = `/` + _.compact([chompSlash(stage), chompSlash(prefix_)]).join('/');
      app.use(prefix, ...rest);
    },

    listen: function(callback) {
      exports.express_listen(app, name, function(err, port) {
        return callback(err, port);
      });
    },

    listen_port: function(port, callback) {
      exports.express_listen_port(app, name, port, function(err, port) {
        return callback(err, port);
      });
    },

    close: function() {
      exports.express_close();
    }
  };

  return result;
};

/**
 *  Calls Node.js listen function unless on Lambda, where Lambda will listen on a
 *  domain socket for us.
 *
 * @param {*} app                 - The app.
 * @param {*} name                - The name of the app.
 * @param {*} callback            - The typical continuation function
 * @returns {null}                - [[NOTE: the return statement is just to end control-flow, no meaningful data is returned.]]
 */
exports.express_listen = function(app, name, callback) {
  return exports.express_listen_port(app, name, null, callback);
};

/**
 *  Calls Node.js listen function unless on Lambda, where Lambda will listen on a
 *  domain socket for us.
 *
 * @param {*} app                 - The app.
 * @param {*} name                - The name of the app.
 * @param {number} port_          - The port to listen on.
 * @param {*} callback            - The typical continuation function
 * @returns {null}                - [[NOTE: the return statement is just to end control-flow, no meaningful data is returned.]]
 */
exports.express_listen_port = function(app, name, port_, callback) {

  if (!isAws()) {
    const port  = getPort(port_);
    if (port <= 0)  { console.log(`Not starting server`); return; }

    server = app.listen(port, () => {
      console.log(`Run-anywhere/express app ${name} is listening on ${port}`);
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
exports.express_close = function() {
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

/**
 *  Provides middleware for run-anywhere's Express app.
 *
 *  * Get DB connections at startup, and share in each request, so we dont have to
 *    open and close the DB connection all the time, but also allowing the code
 *    to get DB connections whenever needed in the case of something like Lamba
 *
 * @param {string} stage        - The stage
 * @param {object} ARGV         - The ARGV.
 * @param {string} dbName       - The name of the DB.
 * @param {string[]} collNames  - Array of collection names.
 *
 * @returns {function}          - An express.js middleware function that augments context with ra
 */
exports.raContextMw = exports.express_raMw = function(stage, ARGV, dbName, collNames = []) {
  var   raApp = {context:{}};

  // We grab connections to the DB here, so we dont have to close the DB after
  // every request.

  collNames.forEach(collName => {

    // TODO: this is an async function, must await, or use Promise
    const { coll, close } = getGetXyzDb(dbName, collName)(raApp.context);

    collections[collName] = coll;
    closes[collName]      = close;
  });

  const seedContextHolder = JSON.stringify({context:{}, event:{}});

  // Hook into the request/response stream -- the prototypical express.js middleware pattern
  return function(req, res, next) {

    var   contextHolder         = JSON.parse(seedContextHolder);

    contextHolder.context.ARGV  = ARGV.pod();

    const raHostKey             = `apiGateway`;
    req[raHostKey]              = contextHolder;

    var   { ractx }             = reqResContext.ensureContext(req, res, `${raHostKey}.context`, `${raHostKey}.event`);
    ractx.stage                 = stage;

    req.raApp                   = req.raApp || raApp;

    // If you ever need to hook in and know when the request completes, see for an example:
    //    https://github.com/expressjs/compression/blob/master/index.js
    // and see `hook` below.

    return next();
  };
};

// -------------------------------------------------------------------------------------
//  Helper functions
//


// -------------------------------------------------------------------------------------
//  Helper functions
//

/**
 *  Allows the port to come from many places.
 *
 * @param {Number} [port]   - The input port number.
 *
 * @returns {Number}        - The port number
 */
function getPort(port) {
  var port_ = port || process.env.PORT || process.env.port || require('minimist')(process.argv.slice(2)).port || 3000;
  return +port_;
}

function chompSlash(str) {
  if (!str)         { return str; }
  return str.replace(/^[/]+/g, '').replace(/[/]+$/g, '');
}


/**
 *  Example of how to do Express.js middleware when you need to do something at the end
 *  of the request.
 *
 * @param {ServerRequest} req   - The NodeJs request.
 * @param {ServerResponse} res  - The NodeJs response
 * @param {function} next       - The next function to call.
 *
 * @returns {null}              - Nothing. The return statement is just to end the function.
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

