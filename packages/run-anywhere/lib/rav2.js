


// -------------------------------------------------------------------------------------
//  requirements
//

const _                         = require('lodash');
var   utils                     = require('./utils');
const sg                        = utils.sg;
const libExpress                = require('./express');
const libMakeCommand            = require('./v2/make-command');
const libModSquad               = require('./v2/mod-squad');
const lambdaHandler             = require('./v2/lambda-handler');
const expressHost               = require('./v2/express-host');
const sanityChecksLib           = require('./v2/sanity-checks');
const claudiaUtils              = require('./v2/claudia/claudia-utils');
const dbUtils                   = require('./v2/db/db-util');
const redisUtils                = require('./v2/redis/redis-util');
const { promisify }             = require('util');


// -------------------------------------------------------------------------------------
//  Data
//

var   sanityChecks  = [];

// -------------------------------------------------------------------------------------
//  Functions
//

utils.command                 = libMakeCommand.command;
utils.modSquad                = libModSquad.modSquad;
utils.load                    = libModSquad.load;
utils.loads                   = libModSquad.loads;
utils.registerSanityChecks    = sanityChecksLib.registerSanityChecks;
utils.runSanityChecksFor      = sanityChecksLib.runSanityChecksFor;
utils.dbUtils                 = dbUtils;
utils.redisUtils              = redisUtils;
utils.claudiaUtils            = claudiaUtils;

_.each(lambdaHandler, function(v,k) {
  module.exports[k] = v;
});

module.exports.utils                  = utils;
module.exports.sg                     = utils.sg;
module.exports.command                = libMakeCommand.command;
module.exports.modSquad               = libModSquad.modSquad;
module.exports.load                   = libModSquad.load;
module.exports.loads                  = libModSquad.loads;
module.exports.registerSanityChecks   = sanityChecksLib.registerSanityChecks;
module.exports.runSanityChecksFor     = sanityChecksLib.runSanityChecksFor;
module.exports.raExpressMw            = expressHost.raExpressMw;
module.exports.dbUtils                = dbUtils;
module.exports.redisUtils             = redisUtils;
module.exports.claudiaUtils           = claudiaUtils;

module.exports.express = {
  middleware: expressHost.raExpressMw,
  listen:     expressHost.listen,             /* (app, [callback]) */
  close:      expressHost.close,
};



module.exports.getExpressApp          = function() {
  const expressApp = require('./v2/express-app');

  return expressApp;
};
sanityChecks.push(promisify(function({assert, ...context}, callback) {
  const app = module.exports.getExpressApp();
  return app.runAnywhere.listen(function(err, port) {
    app.runAnywhere.close();

    return callback(null, `getExpressApp()`);
  });
}));

module.exports.paramsFromExpress = libExpress.paramsFromExpress;


sanityChecksLib.registerSanityChecks(module, __filename, sanityChecks);

// -------------------------------------------------------------------------------------
//  Helper functions
//

