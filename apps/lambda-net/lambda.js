if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;

// const quickNet                = require('quick-net');
// const sg0                     = ra.get3rdPartyLib('sg-flow');
// const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'), require('sg-http'));

const {handle}                = require('./lib/handlers');

const {
  entrypoints,
  svcplatforms,
  hosts
}                             = ra;


// ----------------------------------------------------------------------------------------
// We need to export a function that AWS Lambda can call - just re-export the one from RA.
exports.handler = entrypoints.platform_entrypoint_apigateway_lambda_handler;

exports.handler = function(event, context, callback) {
  console.log(`exports.handler`, {event, context});

  return entrypoints.platform_entrypoint_apigateway_lambda_handler(event, context, callback);
  // return callback(null, {ok:true});
};


// -------------------------------------------------------------------------------------
// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoints.apigateway.registerHandler(() => true, svcplatforms.lambda.handler);

// -------------------------------------------------------------------------------------
// Now we also have to register with RAs `host` module.
svcplatforms.lambda.setDispatcher(function(argv, context, callback) {
  return handle(argv, context, callback);
});

// if (process.env.RUN_SIDE_EFFECT_FREE_TESTS) {
//   console.log({t:process.env.RUN_SIDE_EFFECT_FREE_TESTS});
// }
