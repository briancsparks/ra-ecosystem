

const _                         = require('lodash');
const utils                     = require('./utils');
const sg                        = utils.sg;
const libModSquad               = require('./v2/mod-squad');
const lambdaHandler             = require('./v2/lambda-handler');

const modSquad                  = libModSquad.modSquad;

module.exports.utils            = utils;
module.exports.modSquad         = modSquad;
module.exports.lambda_handler   = lambdaHandler.lambda_handler;
module.exports.registerHandler  = lambdaHandler.registerHandler;
