if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
console.log(`Loading ${__filename} 1`);
const ra                      = require('run-anywhere').v2;
console.log(`Loading ${__filename} 2`);

const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'));
const util                    = require('util');
const { _ }                   = sg;
console.log(`Loading ${__filename} 3`);

const {
  entrypoints,
  hosts
}                             = ra;

// -------------------------------------------------------------------------------------
//  Data
//

// -------------------------------------------------------------------------------------
//  Functions
//


console.log(`Loading ${__filename} 4`);


// We need to export a function that AWS Lambda can call.
//
// The easiest thing to do is just to get the 'entrypoint' one from RA, and export it.
exports.handler = entrypoints.aws_lambda.platform_entrypoint_lambda_handler;

// However, you could handle the function call and call RAs entrypoint.
// exports.handler = function(event, context, callback) {
//   entrypoints.aws_lambda.platform_entrypoint_lambda_handler(event, context, callback);
// };

// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoints.aws_lambda.registerHandler(() => true, hosts.aws_lambda.platform_host_lambda_handler);

// Now we also have to register with RAs `host` module.
hosts.aws_lambda.setDispatcher(function(event, context, callback) {

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // TODO: Dispatch it somewhere
  // [[Fake it for now]]
  sg.elog(`Dispatching into app`, {event, context});

  return callback(null, {ok:true});
});

// This is a function to enable smoke testing.
// exports.handler({}, {}, function(err, data) {
//   console.log(`Returned to original caller, err: ${err}`, data);
// });


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//



