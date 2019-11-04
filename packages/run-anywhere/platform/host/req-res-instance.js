if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * As a host, I will:
 *
 * 1. Receive input from an entrypoint function.
 *    * Originally, the nginx-sidecar-rewrite entrypoint.
 * 2. Dispatch it.
 * 3. Sanitize the result.
 *
 */

const sg                        = require('sg0');
const _                         = require('lodash');
const utils                     = require('./utils');
const platform                  = require('../platform-utils-instance');

var   handlerFns    = [];
var   dispatcher    = dispatch;

const logApiCalls   = !!process.env.SG_LOG_RA_HOST_API;

// -----------------------------------------------------------------

// Lambda handler for the function of being the host
exports.platform_host_reqresinst_handler = function(a, b, callback) {
  const startTime = new Date().getTime();

  const event     = platform.normalizeEvent(a);
  logApi(`reqresinst_handler.params`, {event:a, context:b});

  // Turn it into argv,context,callback
  var   [argv,context]      = argvify(event, b);

  return dispatcher(argv, context, function(err, response) {
    const endTime = new Date().getTime();

    const fixedResponse = utils.fixResponse(response);

    logApi(`reqresinst_handler: (${(endTime - startTime) * 1000})`, {argv, err, response, fixedResponse});

    // OK?
    if (err || !response || !response.ok) {
      return callback(err, fixedResponse);
    }

    callback(err, fixedResponse);
  });
};

// -----------------------------------------------------------------

exports.setDispatcher = function(d) {
  dispatcher = d;
};

exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};




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
    console.log(`reqresinst_handler not found`);

    return callback(null, utils.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}


function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}



function argvify(event, context) {
  const argv = event;
  return [argv,context];
}



function logApi(msg, obj, ...rest) {
  if (!logApiCalls) { return; }

  sg.log(`LOGAPI reqresinst(RA_Host): ${msg}`, obj, ...rest);
}

