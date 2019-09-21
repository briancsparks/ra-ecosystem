
const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS || true;      // TODO: remove

module.exports.normalizeEvent = normalizeEvent;

function normalizeEvent(event_) {
  const body    = event_.body || {payload:[]};

  var   event = {...event_};

  if (useSmEvents) {
    event   = {...event, body: {...body, payload: [body.payload[0] ||{}, `...and ${body.payload.length} more.`]}};
  }

  return event;
}
