
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'));
const { _ }                   = sg;
const utils                   = sg.extend(ra.utils, require('./lib/utils'));
const {
  cleanEnv,
  getQuiet,
  getDQuiet,
  setDQuiet,
}                             = utils;

const expressApp              = require('./express-lambda');
const api_builder             = require('./api-builder');

const claudiaPrivateConfig    = require(`./_config/${process.env.AWS_ACCT_TYPE}/private/claudia.json`);
const claudiaPublicConfig     = require(`./_config/${process.env.AWS_ACCT_TYPE}/public/claudia.json`);


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

// ----- Hook into ra
if (api_builder.proxyRouter) {
  ra.claudiaServerlessApi(claudiaPrivateConfig.api.id, api_builder.proxyRouter);
}

ra.expressServerlessRoutes(claudiaPublicConfig.api.id, expressApp.handler);


/**
 * Handles all calls from AWS Lambda.
 *
 * Then, immediately forwards the call into the run-anywhere helper.
 *
 * @param {*} event
 * @param {*} context
 * @param {*} callback
 * @returns
 */
exports.handler = function(event, context, callback) {
  if (!getDQuiet(context)) { console.log(`handler`, sg.inspect({event, context})); }

  console.log("Entry point, event", JSON.stringify({event}, 2));
  console.log("Entry point, context", JSON.stringify({context}, 2));

  return ra.lambda_handler(event, context, callback);
};



// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//



