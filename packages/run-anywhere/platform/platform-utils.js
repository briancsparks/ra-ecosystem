
const sg                        = require('sg0');
const _                         = require('lodash');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS || true;      // TODO: remove

module.exports.normalizeEvent = normalizeEvent;

function normalizeEvent(event_) {
  const body      = decodeBody(event_);
  // const body    = event_.body || {payload:[]};

  var   event = {...event_};

  if (useSmEvents) {
    event   = {...event, body: {...body, payload: [body.payload[0] ||{}, `...and ${body.payload.length} more.`]}};
  }

  return event;
}

function decodeBody(event) {
  const {body, isBase64Encoded} = event;

  if (sg.isnt(body))        { return body; }
  if (!_.isString(body))    { return body; }    /* already parsed */

  var body_ = body;

  if (isBase64Encoded) {
    const buf   = new Buffer(body, 'base64');
    body_       = buf.toString('ascii');
  }

  body_ = sg.safeJSONParse(body_)   || {payload:[]};

  // Make much smaller sometimes
  if (sg.modes().debug) {
    if (Array.isArray(body_.payload) && body_.payload.length > 1) {
      body_ = {...body_, payload: [body_.payload[0], `${body_.payload.length} more items.`]};
    }
  }

  event.body              = body_;
  event.isBase64Encoded   = false;

  return body_;
}

