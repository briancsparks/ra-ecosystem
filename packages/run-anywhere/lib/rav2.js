


// -------------------------------------------------------------------------------------
//  requirements
//

const _                         = require('lodash');
const utils                     = require('./utils');
const sg                        = utils.sg;
const libModSquad               = require('./v2/mod-squad');
const lambdaHandler             = require('./v2/lambda-handler');
const sanityChecks              = require('./v2/sanity-checks');

const modSquad                  = libModSquad.modSquad;

// -------------------------------------------------------------------------------------
//  Data
//

// -------------------------------------------------------------------------------------
//  Functions
//

module.exports.utils                  = utils;
module.exports.modSquad               = modSquad;
module.exports.lambda_handler         = lambdaHandler.lambda_handler;
module.exports.registerHandler        = lambdaHandler.registerHandler;
module.exports.registerSanityChecks   = sanityChecks.registerSanityChecks;
module.exports.runSanityChecksFor     = sanityChecks.runSanityChecksFor;

// -------------------------------------------------------------------------------------
//  Helper functions
//

