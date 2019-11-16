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

const sg                        = require('sg-env');
const _                         = require('lodash');
const http                      = require('http');
const utils                     = require('./utils-req-res');
const outbound                  = require('../platform-utils-outbound');
const {nginxRpxi}               = outbound;
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('entrypoint', 'nginxsidecar');
const logApiV                   = mkLogApiV('entrypoint', 'nginxsidecar');


const ENV                       = sg.ENV();

var   handlerFns    = [];
var   dispatcher    = dispatch;

// ----------------------------------------------------------------------------------------------------------------------------
exports.startServer = function(port_) {
  const port                    = ENV.at('SIDECAR_PORT') || port_ || 3009;

  const server = http.createServer((req, res) => {
    console.log(`Handling: ${req.url}...`);

    return  utils.contextify(req, res, function(err, event, context) {

      return exports.platform_entrypoint(event, context, function(err, {httpCode, ...data}) {
        console.log(`handled ${req.url}`, err, httpCode, data);

        // TODO: Put in right format for rpxi if requested
        var   contentType = 'application/json';

        res.statusCode = httpCode;
        res.setHeader('Content-Type', contentType);
        res.end(JSON.stringify(data));

      });
    });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`listening on ${port}`);
  });

};


// ----------------------------------------------------------------------------------------------------------------------------
// Handler for the function of being the entrypoint
exports.platform_entrypoint = function(event, context, callback) {
  logApiV(`nginx_sidecarproxy_handler.params`, {event, context});

  return dispatcher(event, context, function(err, response) {
    // TODO: Put in right format for rpxi if requested
    logApi(`nginx_sidecarproxy_handler.response`, {event, err, response});
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

