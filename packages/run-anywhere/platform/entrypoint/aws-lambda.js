if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

// TODO: This should be called api-gateway.js -- thats the entrypoint

const sg                        = require('sg0');
const _                         = require('lodash');
const utils                     = require('./utils');

const logApiCalls   = !!process.env.SG_LOG_RA_API       || true;      // TODO: remove
const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS || true;      // TODO: remove
var   handlerFns    = [];

function logApi(msg, obj, ...rest) {
  if (!logApiCalls) { return; }

  sg.log(`LOGAPI (RA_Entrypoint): ${msg}`, obj, ...rest);
}

// -----------------------------------------------------------------

// Lambda handler for the function of being the entrypoint
exports.platform_entrypoint_lambda_handler = function(event, context, callback) {
  const smEvent = {...event, payload: [event.payload[0] || {}, `...and ${event.payload.length} more.`]};

  return dispatch(useSmEvents ? smEvent : event, context, function(err, response) {
    logApi(`RA_Entrypoint.lambda_handler.response`, {err, response});
    return callback(err, response);
  });
};

function dispatch(event, context_, callback) {
  logApi(`LAMBDA_Net.Dispatcher.start`, {event, context:context_});

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // Turn it into argv,context,callback
  var   {argv,context}      = argvify(event, context_);

  // TODO: Dispatch it somewhere
  // [[Fake it for now]]
  logApi(`Dispatching into app`, {argv, context});

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

exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};

function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

function argvify(event_, context_) {
  const event = {...event_};

  const query     = sg.extend(event.queryStringParameters, multiItemItems(event.multiValueQueryStringParameters));
  const body      = decodeBody(event);

  const headers   = sg.extend(event.headers, multiItemItems(event.multiValueHeaders));

  const argvs     = {...headers, ...(event.pathParameters ||{}), ...(event.stageVariables ||{}), ...body, ...query};

  const context   = {...context_, event: event_};

  const argv = {
    ...argvs,
    __meta__: {
      query,
      body,
      path    : event.path,
      method  : event.method,

      event   : event_
    }
  };

  return {argv,context};
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

  body_ = sg.safeJSONParse(body_);

  // Make much smaller sometimes
  if (sg.modes().debug) {
    if (Array.isArray(body_.payload)) {
      body_ = {...body_, payload: [body_.payload[0], `${body_.payload.length} more items.`]};
    }
  }

  return body_;
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


