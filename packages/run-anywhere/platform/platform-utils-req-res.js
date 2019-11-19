
const sg                        = require('sg0');
const _                         = require('lodash');
const platform                  = require('./platform-utils');
const libUrl                    = require('url');
const {decodeBodyObj,
       noop,
       normalizeHeaders,
       methodHasBody}           = require('./platform-utils');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.argvify                  = argvify;
module.exports.normalizeEvent           = normalizeEvent;
module.exports.normalizeEventForLogging = normalizeEventForLogging;
module.exports.decodeBody               = decodeBody;

// ------------------------------------------------------------------------------------------------------------------------------
function argvify(event, context_, callback =noop) {

  // req and res are on event
  const url     = libUrl.parse(event.req.url, true);
  const method  = event.req.method;
  const query   = url.query;
  const path    = url.pathname;
  const headers = normalizeHeaders(event.req.headers);
console.log(`agf`, sg.inspect({url, method, query, path, headers}));

  if (!methodHasBody(method)) {
    let [argv, context] =  platform.argvify(query, /*body=*/{}, headers, /*extras=*/{}, path, method, event, context_);
// console.log(`agf`, sg.inspect({url, method, query, path, headers, argv}));
console.log(`agf`, sg.inspect({url, method, query, path, headers}));
    callback(null, argv, context);
    return [argv, context];
  }

  return sg.getBodyJson(event.req, function(err, body) {
    const event_    = normalizeEvent({...event, body}, context_);
    const body_      = event_.body || body;

    const [argv, context]      =  platform.argvify(query, body_, headers, /*extras=*/{}, path, method, event_, context_);
console.log(`agf`, sg.inspect({url, method, query, path, headers, argv, err, body}));
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

