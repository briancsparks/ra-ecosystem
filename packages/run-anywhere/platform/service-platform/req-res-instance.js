if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * As a svcplatform, I will:
 *
 * 1. Receive input from an entrypoint function.
 *    * Originally, the nginx-sidecar-rewrite entrypoint.
 * 2. Dispatch it.
 * 3. Sanitize the result.
 *
 */

const sg                        = require('sg0');
const _                         = require('lodash');
const inbound                   = require('../platform-utils-inbound');
const {reqRes}                  = inbound;
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('svcplatform', 'reqresinst');
const logApiV                   = mkLogApiV('svcplatform', 'reqresinst');

var   handlerFns    = [];
var   dispatcher    = dispatch;

exports.reqresinst    = {};
// exports.handlers      = {};
// exports.svcplatforms  = {handlers:{}};



// ------------------------------------------------------------------------------------------------------------------------------
// Handler for the function of being the svcplatform
// exports.reqresinst_entrypoint =
// exports.platform_entrypoint =
// exports.reqresinst_handler =
// exports.svcplatforms.handlers.reqresinst =
// exports.handlers.reqresinst =
exports.reqresinst.handler =
exports.platform_svcplatform_reqresinst_handler = function(event, context_, callback) {
  const startTime = new Date().getTime();

  logApiV(`reqresinst_handler.params`, {event, context:context_});
  console.log(`reqresinst_handler.params`, sg.inspect({event:smEvent(event)}));

  // Fix args
  return reqRes.inboundify(event, context_, function(err, argv, context) {

    return dispatcher(argv, context, function(err, response) {
      const endTime = new Date().getTime();

      const fixedResponse = reqRes.fixResponse(response);
      // console.log(`svcplatform_reqResInstance-dispatch: (${(endTime - startTime) * 1})`, {err, response, fixedResponse});

      logApi(`reqresinst_handler: (${(endTime - startTime) * 1000})`, {argv, err, response, fixedResponse});

      // OK?
      if (err || !fixedResponse || !fixedResponse.ok) {
        return callback(err, fixedResponse);
      }

      callback(err, fixedResponse);
    });
  });
};


function smEvent(event) {
  return {...event,
    req : event.req.url,
    res : !!event.res,
  };
}



// ------------------------------------------------------------------------------------------------------------------------------
exports.reqresinst.setDispatcher =
exports.setDispatcher = function(d) {
  dispatcher = d;
};

// ------------------------------------------------------------------------------------------------------------------------------
exports.reqresinst.registerHandler =
exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};


// ------------------------------------------------------------------------------------------------------------------------------
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
    console.log(`reqresinst_handler not found`);

    return callback(null, reqRes.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}


// ------------------------------------------------------------------------------------------------------------------------------
function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

