
const entrypoint              = require('../entrypoint/api-gateway');
const host                    = require('../service-platform/aws-lambda');
const {cleanLog}              = require('../platform-utils');

// -------------------------------------------------------------------------------------
// We need to export a function that AWS Lambda can call.
//
// The easiest thing to do is just to get the 'entrypoint' one from RA, and export it.
exports.handler = entrypoint.apigateway.handler;

// However, you could handle the function call and call RAs entrypoint.
// exports.handler = function(event, context, callback) {
//   entrypoints.aws_lambda.apigateway.handler(event, context, callback);
// };

// -------------------------------------------------------------------------------------
// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoint.registerHandler(() => true, host.lambda.handler);

// -------------------------------------------------------------------------------------
// Now we also have to register with RAs `host` module.
host.setDispatcher(function(argv, context, callback) {

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // TODO: Dispatch it somewhere
  // [[Fake it for now]]
  console.log(`QUICK_Net::params (${__filename})`, cleanLog({argv, context}));

  // Could do something like this, if you use sg-http
  // const _200 = sg._200({ok:true, ...data});
  // return callback(..._200);

  return callback(argv, context);
});

if (require.main === module) {
  const input = require('../inputs/orig-api-gateway.json');
  return exports.handler(input.event, input.context, function(err, argv, context) {
    console.log(err, cleanLog({argv, context}));
  });
}

