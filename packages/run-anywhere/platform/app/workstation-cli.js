
const entrypoint              = require('../entrypoint/cli');
const host                    = require('../host/workstation');
const invokeMw                = require('../middleware/invoke-ra');

const {mkInvokeRa}            = invokeMw;

// -------------------------------------------------------------------------------------
// We need to export a function that AWS Lambda can call.
//
// The easiest thing to do is just to get the 'entrypoint' one from RA, and export it.
exports.handler = entrypoint.cli_handler;

// However, you could handle the function call and call RAs entrypoint.
// exports.handler = function(event, context, callback) {
//   entrypoints.aws_lambda.platform_entrypoint_apigateway_lambda_handler(event, context, callback);
// };

// -------------------------------------------------------------------------------------
// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoint.registerHandler(() => true, host.workstation_handler);

const globIgnore = [__filename];
var sys_argv = {
  globIgnore
};

const invoke_ra = mkInvokeRa({sys_argv:{glob: '**/*.js'}}, {}, /*fnName*/ '');

// -------------------------------------------------------------------------------------
// Now we also have to register with RAs `host` module.
host.setDispatcher(function(argv, context_, callback) {
  var {sys_argv, ...context} = context_;

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // TODO: Dispatch it somewhere
  // [[Fake it for now]]
  console.log(`QUICK_Net::params`, {argv, context});

  // Could do something like this, if you use sg-http
  // const _200 = sg._200({ok:true, ...data});
  // return callback(..._200);

  // TODO: set fnName from inputs
  var fnName = argv._command || argv._[0];
  return invoke_ra({...argv, fnName}, context, function(err, data, ...rest) {
    return callback(err, data, ...rest);
  });
});

entrypoint.main();
