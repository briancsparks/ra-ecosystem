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
const inbound                   = require('../platform-utils-inbound');
const {template}                = inbound;
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('host', 'template');
const logApiV                   = mkLogApiV('host', 'template');

var   handlerFns    = [];
var   dispatcher    = dispatch;


// ----------------------------------------------------------------------------------------------------------------------------
// Lambda handler for the function of being the host
const template_handler = exports.platform_host_template_handler = function(event, context_, callback) {       // TODO: change `template` as appr
  const startTime = new Date().getTime();

  logApiV(`template_handler.params`, {event, context:context_});

  // Fix args
  return template.inboundify(event, context_, function(err, argv, context) {

    return dispatcher(argv, context, function(err, response) {
      const endTime = new Date().getTime();

      const fixedResponse = template.fixResponse(response);

      logApi(`template_handler: (${(endTime - startTime) * 1000})`, {argv, err, response, fixedResponse});

      // OK?
      if (err || !fixedResponse || !fixedResponse.ok) {
        return callback(err, fixedResponse);
      }

      callback(err, fixedResponse);
    });
  });
};

module.exports.template = {};
module.exports.template.handler = template_handler;
module.exports.template_handler = template_handler;



// ----------------------------------------------------------------------------------------------------------------------------
exports.setDispatcher = function(d) {
  dispatcher = d;
};

// ----------------------------------------------------------------------------------------------------------------------------
exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};

// ----------------------------------------------------------------------------------------------------------------------------
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

    return callback(null, template.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

