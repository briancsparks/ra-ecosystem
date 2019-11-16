
// TODO: I think none of these are used any more.

const sg                        = require('sg0');
const _                         = require('lodash');

module.exports.fixResponse = fixResponse;
module.exports.argvify     = argvify;

function fixResponse(resp_) {
  if (sg.isnt(resp_))   { return resp_; }

  var   resp = {};

  if (sg.modes().prod) {
    resp = _.omit(resp_, 'debug', 'dbg');
  }

  return resp;
}

function argvify(query_, body_, headers_, extras, path_, method_, event_, context_) {
  const event = {...event_};

  // const query     = sg.extend(event.queryStringParameters, multiItemItems(event.multiValueQueryStringParameters));
  // const body      = decodeBody(event);
  // const headers   = sg.extend(event.headers, multiItemItems(event.multiValueHeaders));

  const query     = query_    || {};
  const body      = body_     || {};
  const headers   = headers_  || {};

  const argvs     = {...headers, ...(extras ||{}), ...body, ...query};
  const context   = {...context_, event: event_};
  const path      = path_   || event.path;
  const method    = method_ || event.method;

  const argv = {
    ...argvs,
    __meta__: {
      query,
      body,
      path,
      method,

      event   : event_
    }
  };

  return [argv,context];
}


