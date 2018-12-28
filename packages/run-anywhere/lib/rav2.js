


// -------------------------------------------------------------------------------------
//  requirements
//

const _                         = require('lodash');
const utils                     = require('./utils');
const sg                        = utils.sg;
const libModSquad               = require('./v2/mod-squad');
const lambdaHandler             = require('./v2/lambda-handler');
const sanityChecksLib           = require('./v2/sanity-checks');
const { promisify }             = require('util');

const modSquad                  = libModSquad.modSquad;

// -------------------------------------------------------------------------------------
//  Data
//

var   sanityChecks  = [];

// -------------------------------------------------------------------------------------
//  Functions
//

module.exports.utils                  = utils;
module.exports.modSquad               = modSquad;
module.exports.lambda_handler         = lambdaHandler.lambda_handler;
module.exports.registerHandler        = lambdaHandler.registerHandler;
module.exports.registerSanityChecks   = sanityChecksLib.registerSanityChecks;
module.exports.runSanityChecksFor     = sanityChecksLib.runSanityChecksFor;



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

sanityChecksLib.registerSanityChecks(module, __filename, sanityChecks);

// -------------------------------------------------------------------------------------
//  Helper functions
//

