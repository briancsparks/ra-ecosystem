
const sg                      = require('sg-argv');
const entrypoint              = require('../entrypoint/nginx-sidecar-rproxy');
const host                    = require('../service-platform/req-res-instance');
const checkMw                 = require('../middleware/check-config');
const invokeMw                = require('../middleware/invoke-ra');
const {
  logSmData,
  smArgv,
  smArgv2,
}                             = require('../../lib/v3/utils');

const {
  mkInvokeRaV2,
  getFnTable,
}                             = invokeMw;
const {mkDetector}            = checkMw;

// -------------------------------------------------------------------------------------
// We need to export a function that AWS Lambda can call.
//
// The easiest thing to do is just to get the 'entrypoint' one from RA, and export it.
exports.handler = entrypoint.nginx_sidecar_entrypoint;

// However, you could handle the function call and call RAs entrypoint.
// exports.handler = function(event, context, callback) {
//   entrypoint.nginx_sidecar_entrypoint(event, context, callback);
// };

// -------------------------------------------------------------------------------------
// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoint.registerHandler(() => true, host.reqresinst_handler);


function main(ARGV, user_sys_argv_ ={}) {
  var sys_argv  = {glob: '**/*.js'};

  return getFnTable(sys_argv, function(err, fnTable) {
    if (err) { console.log(err); return; }

    const invoke_ra             = mkInvokeRaV2(fnTable, getRequestInfo);
    const detect_probs_invoke   = mkDetector({}, invoke_ra);

    // -------------------------------------------------------------------------------------
    // Now we also have to register with RAs `host` module.
    host.setDispatcher(function(argv, context_, callback) {
      var {sys_argv, ...context} = context_;

      // So, this is it! We are now handling the event/request. We have to dispatch it, and
      // then handle the final callback to the AWS service.

      // TODO: Dispatch it somewhere
      // [[Fake it for now]]
      // console.log(`QUICK_Net::params (${__filename})`, {argv, context});

      // Could do something like this, if you use sg-http
      // const _200 = sg._200({ok:true, ...data});
      // return callback(..._200);

      // TODO: set fnName from inputs
      // var fnName = argv._command || argv._[0];

      return detect_probs_invoke({...argv}, context, function(err, data, ...rest) {
        // console.log(`nginx-sidecar-dispatch`, {err, ...logSmData({data, rest})});
        return callback(err, data, ...rest);
      });
    });

    var port  = ARGV.port;
    entrypoint.startServer(port);



    //=========================================================================================================================
    function getRequestInfo(argv, context, callback) {
      var   path = argv && argv.__meta__ && argv.__meta__.path ||'';

      path = path.split('/');

      var   info = {fnName: path && path[2], sys_argv:{}};
      return callback(null, info);
    }
  });
}

if (require.main === module) {
  main(sg.ARGV());
}
