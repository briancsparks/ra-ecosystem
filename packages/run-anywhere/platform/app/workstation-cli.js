
const entrypoint              = require('../entrypoint/cli');
const host                    = require('../service-platform/workstation');
const checkMw                 = require('../middleware/check-config');
const invokeMw                = require('../middleware/invoke-ra');
const {logSmData}             = require('../../lib/v3/utils');
const {cleanLog}              = require('../platform-utils');

const {mkInvokeRa}            = invokeMw;
const {mkDetector}            = checkMw;

// -------------------------------------------------------------------------------------
// We need to export a function that AWS Lambda can call.
//
// The easiest thing to do is just to get the 'entrypoint' one from RA, and export it.
exports.handler = entrypoint.cli_entrypoint;

// However, you could handle the function call and call RAs entrypoint.
// exports.handler = function(event, context, callback) {
//   entrypoint.cli_entrypoint(event, context, callback);
// };

// -------------------------------------------------------------------------------------
// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoint.registerHandler(() => true, host.workstation_handler);

const globIgnore = [__filename];
var sys_argv = {
  globIgnore
};

const invoke_ra             = mkInvokeRa({sys_argv:{glob: '**/*.js'}}, {}, /*fnName*/ '');
const detect_probs_invoke   = mkDetector({}, invoke_ra);

// -------------------------------------------------------------------------------------
// Now we also have to register with RAs `host` module.
host.setDispatcher(function(argv, context_, callback) {
  var {sys_argv, ...context} = context_;

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // Could do something like this, if you use sg-http
  // const _200 = sg._200({ok:true, ...data});
  // return callback(..._200);

  // TODO: set fnName from inputs
  var fnName = argv._command || argv._[0];
  return detect_probs_invoke({...argv, fnName}, context, function(err, data, ...rest) {
    if (typeof err === 'string' && err === 'ENOFN') {
      console.error(`---- Could not find your function. Maybe run list-fns-save-json`);
    }

    console.log(`workstation-cli-dispatch`, {err, ...logSmData({data, rest})});
    return callback(err, data, ...rest);
  });
});

if (require.main === module) {
  entrypoint.main(null, null, true);
}
