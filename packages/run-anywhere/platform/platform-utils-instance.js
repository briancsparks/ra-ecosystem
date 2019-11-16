
const sg                        = require('sg0');
const _                         = require('lodash');
const libUrl                    = require('url');
const platform                  = require('./platform-utils');
const {decodeBodyObj,
       noop,
       normalizeHeaders,
       methodHasBody}           = require('./platform-utils');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.normalizeEvent           = normalizeEvent;
module.exports.normalizeEventForLogging = normalizeEventForLogging;
module.exports.decodeBody               = decodeBody;

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

