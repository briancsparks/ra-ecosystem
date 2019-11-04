if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * TODO: Fill in a description.
 *
 * As a host, I will:
 *
 * 1. Receive input from an entrypoint function.
 * 2. Dispatch it.
 * 3. Sanitize the result somehow.
 *
 */

const sg                        = require('sg0');
const _                         = require('lodash');
const utils                     = require('./utils');

var   handlerFns    = [];
var   dispatcher    = dispatch;

const logApiCalls   = !!process.env.SG_LOG_RA_HOST_API;

// -----------------------------------------------------------------

// Lambda handler for the function of being the host
exports.platform_host_template_handler = function(a, b, callback) {       // TODO: change `template` as appr
  const startTime = new Date().getTime();

  // const event     = platform.normalizeEvent(a);                        // TODO: convert to event-like thing preping for argvify
  const event     = a;
  logApi(`template_handler.params`, {event:a, context:b});

  // Turn it into argv,context,callback
  var   [argv,context]      = argvify(event, b);

  return dispatcher(argv, context, function(err, response) {
    const endTime = new Date().getTime();

    const fixedResponse = utils.fixResponse(response);

    logApi(`template_handler: (${(endTime - startTime) * 1000})`, {argv, err, response, fixedResponse});

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
    console.log(`template_handler not found`);

    return callback(null, utils.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}


function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}



function argvify(event, context) {
  const argv = event;
  return [argv,context];
}



function logApi(msg, obj, ...rest) {
  if (!logApiCalls) { return; }

  sg.log(`LOGAPI template(RA_Host): ${msg}`, obj, ...rest);
}

