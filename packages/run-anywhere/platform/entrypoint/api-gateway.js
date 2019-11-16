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

const sg                        = require('sg0');
const _                         = require('lodash');
// const utils                     = require('./utils');
const outbound                  = require('../platform-utils-outbound');
const {apiGatewayProxy}         = outbound;
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('entrypoint', 'apigateway');
const logApiV                   = mkLogApiV('entrypoint', 'apigateway');

var   handlerFns    = [];

// -----------------------------------------------------------------

// Lambda handler for the function of being the entrypoint
exports.platform_entrypoint_apigateway_lambda_handler = function(event, context, callback) {
  logApiV(`lambda_handler.params`, {event, context});

  return dispatch(event, context, function(err, response) {
    logApi(`lambda_handler.response`, {event, err, response});
    return callback(err, response);
  });
};


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
        const fixedResponse = apiGatewayProxy.fixResponse(response);
        logApiV(`Dispatched`, {event, err, response: fixedResponse});
        return callback(err, fixedResponse);
      });
    }
  });

  // Was it handled?
  if (!handled) {
    console.log(`lambda_handler not found while dispatching from the platform entrypoint.`);

    return callback(null, {statusCode: 404, body: JSON.stringify({ok: false})});
  }
}





exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};

function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

// function fixResponseForApiGatewayLambdaProxy(resp) {

//   // Do we have a response?
//   if (!resp) {
//     sg.elog(`ENORESP: No response`);

//     // Have to return something
//     return {
//       statusCode        : 500,
//       body              : sg.safeJSONStringify({error: 'server'}),
//       isBase64Encoded   : false
//     };
//   }

//   // Maybe the response is already in the right format
//   if ('statusCode' in resp && typeof resp.body === 'string' && 'isBase64Encoded' in resp) {
//     return resp;
//   }

//   // NOTE: You can also have "headers" : {}

//   return {
//     statusCode        : resp.statusCode ||  resp.httpCode || (resp.ok === true ? 200 : 404),
//     body              : sg.safeJSONStringify(resp),
//     isBase64Encoded   : false
//   };
// }

