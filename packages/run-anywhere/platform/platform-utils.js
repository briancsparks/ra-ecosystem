
  /**
   * @file
   *
   * This is the file for utilities that help implement platform.
   *
   * utils.js is for users of platform.
   */

const sg0                       = require('sg-argv');
const sg                        = sg0.merge(sg0, require('sg-env'), require('@sg0/sg-smart-value'));
const _                         = require('lodash');

const ENV                       = sg.ENV();

// const useSmEvents      = !!process.env.SG_LOG_SMALL_EVENTS;
const logApiCalls       = ENV.at('RA_LOG_HOST_API');
const logApiCallsV      = ENV.at('RA_LOG_VERBOSE_HOST_API');


module.exports.decodeBodyObj    = decodeBodyObj;
module.exports.argvify          = argvify;
module.exports.argvify_smart    = argvify_smart;
module.exports.contextify       = contextify;
module.exports.contextify_smart = contextify_smart;
module.exports.contextify_Xyz   = contextify_Xyz;
module.exports.normalizeHeaders = normalizeHeaders;
module.exports.methodHasBody    = methodHasBody;
module.exports.fixResponse      = fixResponse;
module.exports.mkLogApi         = mkLogApi;
module.exports.mkLogApiV        = mkLogApiV;
module.exports.asErr            = asErr;
module.exports.noop             = noop;


// ------------------------------------------------------------------------------------------------------------------------------
function decodeBodyObj(body_, event, context, {smaller}) {
  if (!_.isString(body_))    { return body_; }    /* already parsed */

  var   body = sg.safeJSONParse(body_) ||{};

  // Make much smaller sometimes
  if (smaller) {
    if (Array.isArray(body.payload) && body.payload.length > 1) {
      body = {...body, payload: [body.payload[0] ||{}, `... and ${body.payload.length} more items.`]};
    }
  }

  // 'items' is the prefered key, but only use if not already present, but leave 'payload'
  if (!('items' in body) && Array.isArray(body.payload)) {
    body.items = body.payload;
  }

  return body;
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify(query_, body_, headers_, extras, path_, method_, event_, context ={}, extraContext ={}) {
  const event = {...(event_ ||{})};

  const query     = query_    || {};
  const body      = body_     || {};
  const headers   = headers_  || {};

  const path      = path_     || event.path     || '';
  const method    = method_   || event.method   || '';

  // TODO: the headers that we know come from nginx need to be last so they are not overridden.
  const argvs     = {method, path, ...headers, ...(extras ||{}), ...body, ...query};

  const argv = {
    ...argvs,
    __meta__: {
      query,
      body,
      path,
      method,
      headers,

      event   : event_
    }
  };

  return [argv, {...context, ...extraContext}];
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify_Xyz(argv, context, ...rest) {
  var   args      = [...rest];
  const callback  = (_.isFunction(_.last(args)) && args.pop()) || noop;
  const event     = args.shift();

  return callback(null, ...contextify_smart(argv, context, event));
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify_smart(event, context, argv) {
  if (!sg.isnt(argv)) {
    if (argv && argv.__meta__ && argv.__meta__.event) {
      return [argv, context];
    }

    // We have argv, but it isnt right, fix it
    return argvify(/*query=*/null, /*body=*/null, /*headers=*/null, /*extras=*/null, /*path=*/null, /*method=*/null, sg.or(event, argv), sg.orObj(context));
  }

  return argvify(/*query=*/null, /*body=*/null, /*headers=*/null, /*extras=*/null, /*path=*/null, /*method=*/null, sg.orObj(event), sg.orObj(context));
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify_smart(a, context, event) {
  if (!sg.isnt(a)) {

    // Ideally, argvify has already been done
    if (a && a.__meta__ && a.__meta__.event) {
      return contextify_(a, context, event);
    }

    // Maybe a is {argv}
    if (a.argv) {
      let [argv] = argvify_smart(null, context, a.argv);
      return contextify_(argv, context, event);
    }

    // Maybe a is {event}
    if (a.event || event) {
      let [argv] = argvify_smart(a.event || event, context);
      return contextify_(argv, context, a.event || event);
    }
  }

  let [argv] = argvify_smart(a, context);
  return contextify_(argv, context, event);
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify_(argv, context, ...rest) {
  return [argv ||{}, contextify(argv, context, ...rest)];
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify(argv, context, event) {
  return { ...context,
    event   : context.event || (argv && argv.__meta__ && argv.__meta__.event) || event || {},
    argv    : context.argv  || argv  || {}
  };
}

// ------------------------------------------------------------------------------------------------------------------------------
function normalizeHeaders(headers) {
  return sg.reduceObj(headers, {}, function(m, v, k) {
    return [sg.smartKey(k), v];
  });
}

// ------------------------------------------------------------------------------------------------------------------------------
const bodies = ':put:post:';
function methodHasBody(method) {
  return bodies.indexOf(':'+ method.toLowerCase() +':') !== -1;
}

// ------------------------------------------------------------------------------------------------------------------------------
function fixResponse(resp_) {
  if (sg.isnt(resp_))   { return resp_; }

  var   resp = {...resp_};

  if (sg.modes().prod) {
    resp = _.omit(resp_, 'debug', 'dbg');
  }

  return resp;
}

// ------------------------------------------------------------------------------------------------------------------------------
function mkLogApi(modType, modName) {
  return function(msg, obj, ...rest) {
    if (!logApiCalls) { return; }

    sg.log(`LOGAPI ${modName}(RA_${modType}): ${msg}`, obj, ...rest);
  };
}

// ------------------------------------------------------------------------------------------------------------------------------
function mkLogApiV(modType, modName) {
  return function(msg, obj, ...rest) {
    if (!logApiCallsV) { return; }

    sg.log(`LOGAPI ${modName}(RA_${modType}): ${msg}`, obj, ...rest);
  };
}

// ------------------------------------------------------------------------------------------------------------------------------
function asErr(obj) {
  const squashed = sg.merge(obj);
  if (sg.firstKey(squashed)) {
    return squashed;
  }

  return null;
}


// ------------------------------------------------------------------------------------------------------------------------------
function noop(){}
