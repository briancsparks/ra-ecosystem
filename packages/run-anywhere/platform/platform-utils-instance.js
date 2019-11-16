
const sg                        = require('sg0');
const _                         = require('lodash');
const libUrl                    = require('url');
const {decodeBodyObj,
       noop,
       normalizeHeaders,
       methodHasBody}           = require('./platform-utils');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.normalizeEvent           = normalizeEvent;
module.exports.normalizeEventForLogging = normalizeEventForLogging;
module.exports.decodeBody               = decodeBody;

// ------------------------------------------------------------------------------------------------------------------------------
function argvify(event_, context, callback =noop) {

  // req and res are on event
  const url     = libUrl.parse(event.req, true);
  const method  = url.method;
  const query   = url.query;
  const path    = url.pathname;
  const headers = normalizeHeaders(event.req.headers);

  if (!methodHasBody(method)) {
    let argv =  argvify(query, /*body=*/{}, headers, /*extras=*/{}, path, method, event, context);
    callback(null, argv, context);
    return [argv, context];
  }

  return sg.getBodyJson(event.req, function(err, body_) {
    const event_    = normalizeEvent({...event, body_}, context);
    const body      = event_.body || body_;

    const argv      =  argvify(query, body, headers, /*extras=*/{}, path, method, event_, context);
    return callback(err, argv, context);
  });
}

// ------------------------------------------------------------------------------------------------------------------------------
function normalizeEvent(event_, context) {

  var   event = {...event_};

  // Must have body for these
  const body = decodeBody(event_, context, useSmEvents);
  event = {...event, ...(body ||{})};

  return event;
}

// ------------------------------------------------------------------------------------------------------------------------------
function normalizeEventForLogging(event_, context) {

  var   event = {...event_};

  // Must have body for these
  const body = decodeBody(event_, context, true);
  event = {...event, ...(body ||{})};

  return event;
}

// ------------------------------------------------------------------------------------------------------------------------------
function decodeBody(event, context, smaller) {
  return decodeBodyObj(event.body, event, context, {smaller});
}

