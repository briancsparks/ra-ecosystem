
const sg                        = require('sg0');
const _                         = require('lodash');
const utils                     = require('./utils');
const platform                  = require('../platform-utils');


var   handlerFns    = [];
var   dispatcher    = dispatch;

const logApiCalls   = !!process.env.SG_LOG_RA_HOST_API       || true;      // TODO: remove

function logApi(msg, obj, ...rest) {
  if (!logApiCalls) { return; }

  sg.log(`LOGAPI (RA_Host): ${msg}`, obj, ...rest);
}


// -----------------------------------------------------------------

// Lambda handler for the function of being the host
exports.platform_host_lambda_handler = function(event_, context_, callback) {
  const startTime = new Date().getTime();

  const event     = platform.normalizeEvent(event_);
  logApi(`lambda_handler.params`, {event:event_, context_});

//  const onEntry = {
//    event     : JSON.parse(JSON.stringify(event)),
//    context   : JSON.parse(JSON.stringify(context)),
//  };

  // Turn it into argv,context,callback
  var   [argv,context]      = argvify(event, context_);

  return dispatcher(event, context, function(err, response) {
    const endTime = new Date().getTime();

    const fixedResponse = utils.fixResponse(response);

    logApi(`lambda_handler: (${(endTime - startTime) * 1000})`, {event, err, response, fixedResponse});

    // OK?
    if (err || !response || !response.ok) {
      return callback(err, fixedResponse);
    }

    callback(err, fixedResponse);
  });
};


// -----------------------------------------------------------------

exports.setDispatcher = function(d) {
  dispatcher = d;
};

exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};




function dispatch(event, context, callback) {
  var   handled       = false;
  _.each(handlerFns, (handler) => {
    if (handled) { return; }

    if (handler.select(event, context)) {
      handled = true;
      return handler.handleIt(event, context, callback);
    }
  });

  if (!handled) {
    console.log(`lambda_handler not found`);

    return callback(null, utils.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}


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

  return [argv,context];
}

function multiItemItems(obj) {
  return sg.reduce(obj, {}, (m,v,k) => {
    if (v.length > 1) {
      return sg.kv(m,k,v);
    }

    return m;
  });
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

