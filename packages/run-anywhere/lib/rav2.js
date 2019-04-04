


// -------------------------------------------------------------------------------------
//  requirements
//

const _                         = require('lodash');
var   utils                     = require('./utils');
const sg                        = utils.sgsg;
const libExpress                = require('./express');
const libMakeCommand            = require('./v2/make-command');
const libModSquad               = require('./v2/mod-squad');
const lambdaHandler             = require('./v2/lambda-handler');
const expressHost               = require('./v2/express-host');
const claudiaUtils              = require('./v2/claudia/claudia-utils');
const dbUtils                   = require('./v2/db/db-util');
const redisUtils                = require('./v2/redis/redis-util');
const { promisify }             = require('util');


// -------------------------------------------------------------------------------------
//  Data
//


// -------------------------------------------------------------------------------------
//  Functions
//

utils.command                 = libMakeCommand.command;
utils.invoke2                 = libMakeCommand.invoke2;
utils.invoke                  = libMakeCommand.invoke;
utils.modSquad                = libModSquad.modSquad;
utils.load                    = libModSquad.load;
utils.loads                   = libModSquad.loads;
utils.dbUtils                 = dbUtils;
utils.redisUtils              = redisUtils;
utils.claudiaUtils            = claudiaUtils;

_.each([lambdaHandler, expressHost, libModSquad, libMakeCommand], lib => {
  _.each(lib, function(v,k) {
    module.exports[k] = v;
  });
});

module.exports.utils                  = utils;
module.exports.sg                     = utils.sgsg;
module.exports.command                = libMakeCommand.command;
module.exports.commandInvoke          = libMakeCommand.invoke;
module.exports.modSquad               = libModSquad.modSquad;
module.exports.load                   = libModSquad.load;
module.exports.loads                  = libModSquad.loads;
module.exports.exportSubModules       = libModSquad.exportSubModules;
module.exports.raExpressMw            = expressHost.raExpressMw;
module.exports.dbUtils                = dbUtils;
module.exports.redisUtils             = redisUtils;
module.exports.claudiaUtils           = claudiaUtils;

module.exports.express = {
  hookIntoHost: expressHost.express_hookIntoHost,
  middleware:   expressHost.express_raMw,
  listen:       expressHost.express_listen,             /* (app, [callback]) */
  close:        expressHost.express_close,
};
module.exports.paramsFromExpress = libExpress.paramsFromExpress;



// -------------------------------------------------------------------------------------
//  Helper functions
//

