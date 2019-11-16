if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * As a host, I will:
 *
 * 1. Receive input from an entrypoint function.
 *    * Originally, the cli.js entrypoint.
 * 2. Dispatch it.
 * 3. Sanitize the result somehow.
 *
 */

const sg                        = require('sg0');
const _                         = require('lodash');
const inbound                   = require('../platform-utils-inbound');
const ARGVUtils                 = require('../platform-utils-ARGV');
const {workstation,
       cliWorkstation}          = inbound;
const platform                  = require('../platform-utils');
const {mkLogApi,
       mkLogApiV}               = platform;

const logApi                    = mkLogApi('host', 'workstation');
const logApiV                   = mkLogApiV('host', 'workstation');

var   handlerFns    = [];
var   dispatcher    = dispatch;

// ----------------------------------------------------------------------------------------------------------------------------
// Lambda handler for the function of being the host
const workstation_handler = exports.platform_host_workstation_handler = function(event, context_, callback) {
  const startTime = new Date().getTime();

  // var   {ARGV, user_sys_argv, ...rest} = event;
  logApiV(`workstation_handler.params`, {event, context:context_});

  ARGVUtils.argvify(event, context_, function(errArgvify, argv, context__) {
    return ARGVUtils.contextify(event, context__, function(errContextify, argv_, context) {

      return dispatcher(argv, context, function(err, response) {
        const endTime = new Date().getTime();

        const fixedResponse = workstation.fixResponse(response);

        logApi(`workstation_handler: (${(endTime - startTime) * 1000})`, {argv, err, response, fixedResponse});

        // OK?
        if (err || !fixedResponse || !fixedResponse.ok) {
          return callback(err, fixedResponse);
        }

        callback(platform.asErr({errArgvify, errContextify, err}), fixedResponse);
      });
    });
  });
};

module.exports.workstation = {};
module.exports.workstation.handler = workstation_handler;
module.exports.workstation_handler = workstation_handler;




// ----------------------------------------------------------------------------------------------------------------------------
exports.setDispatcher = function(d) {
  dispatcher = d;
};

// ----------------------------------------------------------------------------------------------------------------------------
exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};

// ----------------------------------------------------------------------------------------------------------------------------
function dispatch(event, context, callback) {
  var   handled       = false;
  _.each(handlerFns, (handler) => {
    if (handled) { return; }

    if (handler.select(event, context)) {
      handled = true;
      return handler.handleIt(event, context, callback);
    }
  });

  if (!handled) {
    console.log(`workstation_handler not found`);

    return callback(null, workstation.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

