if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * As an entrypoint, I know the format of the request and response. However,
 * for efficiencys sake, we usually only do the translation of the response,
 * and let the host-level function translate into the argv style.
 *
 *
 */

const sg0                       = require('sg-http');
const sg                        = sg0.merge(sg0, require('sg-env'));
const _                         = require('lodash');
const http                      = require('http');
const utils                     = require('./utils-req-res');
const outbound                  = require('../platform-utils-outbound');
const {nginxRpxi}               = outbound;
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('entrypoint', 'nginxsidecar');
const logApiV                   = mkLogApiV('entrypoint', 'nginxsidecar');

exports.handler       = {};
exports.nginxsidecar  = {};


const ENV                       = sg.ENV();

var   handlerFns    = [];
var   dispatcher    = dispatch;


// ----------------------------------------------------------------------------------------------------------------------------
// Handler for the function of being the entrypoint
exports.nginxsidecar.handler =
exports.handler.nginxsidecar =
exports.nginxsidecar_entrypoint =
exports.platform_entrypoint =
exports.platform_entrypoint_nginxsidecar_handler =
function(event, context, callback) {
  logApiV(`nginxsidecarproxy_handler.params`, {event, context});

  return dispatcher(event, context, function(err, response) {
    // TODO: Put in right format for rpxi if requested
    logApi(`nginxsidecarproxy_handler.response`, {event, err, response});
    return callback(err, response);
  });
};







// ----------------------------------------------------------------------------------------------------------------------------
// Dispatch the call
function dispatch(event, context, callback) {
  logApiV(`dispatch.start`, {event, context});

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // Loop over the registered handlers, and see which one to give it to
  var   handled       = false;
  _.each(handlerFns, (handler) => {
    if (handled) { return; }                  /* NOTE: Remove this line to have multiple handlers */

    // Does this handler want it?
    if (handler.select(event, context)) {
      handled = true;

      // Let the handler do its thing
      return handler.handleIt(event, context, function(err, response) {
        const fixedResponse = nginxRpxi.fixResponse(err, response);
        logApiV(`Dispatched`, {event, err, response: fixedResponse});
        return callback(err, fixedResponse);
      });
    }
  });

  // Was it handled?
  if (!handled) {
    console.log(`Host handler not found while dispatching from the platform entrypoint.`);

    return callback(null, {statusCode: 404, body: JSON.stringify({ok: false})});
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
exports.setDispatcher = function(d) {
  dispatcher = d;
};

// ----------------------------------------------------------------------------------------------------------------------------
exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};

// ----------------------------------------------------------------------------------------------------------------------------
function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

