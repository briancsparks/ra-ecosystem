

// TODO: This should be called api-gateway.js -- thats the entrypoint

const sg                        = require('sg0');
const _                         = require('lodash');
const utils                     = require('./utils');

var   handlerFns    = [];

// -----------------------------------------------------------------

// Lambda handler for the function of being the entrypoint
exports.platform_entrypoint_lambda_handler = function(event, context, callback) {
  return dispatch(event, context, function(err, response) {
    sg.log(`RA_Entrypoint.lambda_handler`, {err, response});
    return callback(err, response);
  });
};

exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};

function dispatch(event, context_, callback) {

  // Turn it into argv,context,callback
  var   argv      = argvify(event);
  var   context   = {...context_};

  // Loop over the registered handlers, and see which one to give it to
  var   handled       = false;
  _.each(handlerFns, (handler) => {
    if (handled) { return; }                  /* NOTE: Remove this line to have multiple handlers */

    // Does this handler want it?
    if (handler.select(argv, context)) {
      handled = true;

      // Let the handler do its thing
      return handler.handleIt(argv, context, function(err, response) {
        const fixedResponse = fixResponseForApiGatewayLambdaProxy(response);
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

function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

function argvify(event_, context) {
  const event = {...event_};

  var   query = sg.extend(event.queryStringParameters, multiItemItems(event.multiValueQueryStringParameters));
  var   body  = decodeBody(event);
  var   argv  = {...body, ...query};

  return {
    ...argv,
    __meta__: {
      query,
      body
    }
  };
}

function multiItemItems(obj) {
  return sg.reduce(obj, {}, (m,v,k) => {
    if (v.length > 1) {
      return sg.kv(m,k,v);
    }

    return m;
  });
}

function decodeBody({body, isBase64Encoded}) {
  if (sg.isnt(body))  { return body; }

  var body_ = body;

  if (isBase64Encoded) {
    const buf   = new Buffer(body, 'base64');
    body_       = buf.toString('ascii');
  }

  return sg.safeJSONParse(body_);
}

function fixResponseForApiGatewayLambdaProxy(resp) {

  // Maybe the response is already in the right format
  if ('statusCode' in resp && typeof resp.body === 'string' && 'isBase64Encoded' in resp) {
    return resp;
  }

  // NOTE: You can also have "headers" : {}

  return {
    statusCode        : resp.statusCode ||  resp.httpCode || (resp.ok === true ? 200 : 404),
    body              : utils.safeJSONStringify(resp),
    isBase64Encoded   : false
  };
}


