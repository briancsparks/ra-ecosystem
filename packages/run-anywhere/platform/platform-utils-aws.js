
const sg                        = require('sg0');
const _                         = require('lodash');
const platform                  = require('./platform-utils');
const {decodeBodyObj,noop}      = platform;

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.argvify                  = argvify;
module.exports.normalizeEvent           = normalizeEvent;
module.exports.normalizeEventForLogging = normalizeEventForLogging;
module.exports.decodeBody               = decodeBody;

module.exports.fixResponse_apiGatewayProxy = fixResponse_apiGatewayProxy;


// ------------------------------------------------------------------------------------------------------------------------------
function argvify(event_, context_, callback =noop) {
  var argv, context;
  const event     = normalizeEvent(event_, context_);

  const query     = sg.extend(event.queryStringParameters, multiItemItems(event.multiValueQueryStringParameters));
  const body      = event.body;
  const path      = event.path;
  const method    = event.method;

  const headers   = sg.extend(event.headers, multiItemItems(event.multiValueHeaders));

  const extras    = {...(event.pathParameters ||{}), ...(event.stageVariables ||{})};

  [argv, context] = platform.argvify(query, body, headers, extras, path, method, event, context_);

  callback(null, argv, context);
  return [argv, context];
}

// ------------------------------------------------------------------------------------------------------------------------------
function normalizeEvent(event_, context) {
  const body      = decodeBody(event_, context, useSmEvents);

  var   event = {...event_, ...(body ||{})};

  return event;
}

// ------------------------------------------------------------------------------------------------------------------------------
function normalizeEventForLogging(event_, context) {
  const body      = decodeBody(event_, context, true);

  var   event = {...event_, ...(body ||{})};

  return event;
}

// ------------------------------------------------------------------------------------------------------------------------------
function decodeBody(event, context, smaller) {
  const {body, isBase64Encoded} = event;

  if (sg.isnt(body))        { return body; }
  if (!_.isString(body))    { return body; }    /* already parsed */

  var body_ = body;

  if (isBase64Encoded) {
    const buf   = new Buffer(body, 'base64');
    body_       = buf.toString('ascii');
  }

  body_ = decodeBodyObj(body_, event, context, {smaller});

  event.body              = body_;
  event.isBase64Encoded   = false;

  return body_;
}

// ------------------------------------------------------------------------------------------------------------------------------
function multiItemItems(obj) {
  return sg.reduce(obj, {}, (m,v,k) => {
    if (v.length > 1) {
      return sg.kv(m,k,v);
    }

    return m;
  });
}

// ------------------------------------------------------------------------------------------------------------------------------
function fixResponse_apiGatewayProxy(resp) {

  // Do we have a response?
  if (!resp) {
    sg.elog(`ENORESP: No response`);

    // Have to return something
    return {
      statusCode        : 500,
      body              : sg.safeJSONStringify({error: 'server'}),
      isBase64Encoded   : false
    };
  }

  // Maybe the response is already in the right format
  if ('statusCode' in resp && typeof resp.body === 'string' && 'isBase64Encoded' in resp) {
    return resp;
  }

  // NOTE: You can also have "headers" : {}

  return {
    statusCode        : resp.statusCode ||  resp.httpCode || (resp.ok === true ? 200 : 404),
    body              : sg.safeJSONStringify(resp),
    isBase64Encoded   : false
  };
}


