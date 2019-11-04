
const sg                        = require('sg0');
const _                         = require('lodash');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.normalizeEvent = normalizeEvent;
module.exports.decodeBody     = decodeBody;

function normalizeEvent(event_, context) {

  var   event = {...event_};

  // Must have body for these
  const body = decodeBody(event_, context);
  if (body) {
    if (useSmEvents) {
      event   = {...event, body: {...body, payload: [body.payload[0] ||{}, `...and ${body.payload.length} more.`]}};
    } else {
      event   = {...event, body};
    }
  }

  return event;
}

function decodeBody(event, context) {
  const {body ={}} = event;

  if (!_.isString(body))    { return body; }    /* already parsed */

  return {...(sg.safeJSONParse(body) ||{})};
}

