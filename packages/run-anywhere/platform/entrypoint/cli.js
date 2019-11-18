if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * As an entrypoint, I know the format of the request and response. However,
 * for efficiencys sake, we usually only do the translation of the response,
 * and let the host-level function translate into the argv style.
 *
 *
 */

const sg                        = require('sg-argv');
const _                         = require('lodash');
const http                      = require('http');
const libUrl                    = require('url');
const {extractSysArgv}          = require('../../lib/v3/invoke');
const outbound                  = require('../platform-utils-outbound');
const {cli}                     = outbound;
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('entrypoint', 'cli');
const logApiV                   = mkLogApiV('entrypoint', 'cli');



var   handlerFns    = [];
var   dispatcher    = dispatch;

// ----------------------------------------------------------------------------------------------------------------------------
exports.main = function(argv_, user_sys_argv_ ={}, start) {
  if (sg.isnt(argv_))                                                         { return exports.main(sg.ARGV() ||{}, user_sys_argv_, start); }
  if (!start)                                                                 { return; }
  // if ((argv_._command || (argv_._ && argv_._[0]) || '').startsWith('rai_'))   { return; }

  const event     = {argv:argv_, user_sys_argv:user_sys_argv_};
  const context   = {};

  return exports.platform_entrypoint(event, context, function(err, response, ...rest) {
    var {httpCode, ...data} = response;
    console.log(`cli-entrypoint-main-cb`, sg.inspect({err, data, rest}));
  });
};


// ----------------------------------------------------------------------------------------------------------------------------
// Handler for the function of being the entrypoint
exports.platform_entrypoint = function(event, context, callback) {
  logApiV(`cli_handler.params`, {event, context});

  return dispatcher(event, context, function(err, response) {
    // TODO: Format the response output
    logApi(`cli_handler.response`, {event, err, response});
    return callback(err, response);
  });
};



// ----------------------------------------------------------------------------------------------------------------------------
// Dispatch the call
function dispatch(event, context, callback) {
  logApiV(`dispatch.start`, {event, context});

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // Loop over the registered handlers, and see which one to give it to
  var   handled       = false;
  _.each(handlerFns, (handler) => {
    if (handled) { return; }                  /* NOTE: Remove this line to have multiple handlers */

    // Does this handler want it?
    if (handler.select(event, context)) {
      handled = true;

      // Let the handler do its thing
      return handler.handleIt(event, context, function(err, response) {
        const fixedResponse = cli.fixResponse(err, response);
        logApiV(`Dispatched from cli-ep`, {event, err, response: fixedResponse});
        return callback(err, fixedResponse);
      });
    }
  });

  // Was it handled?
  if (!handled) {
    console.log(`Host handler not found while dispatching from the cli platform entrypoint.`);

    return callback(null, {statusCode: 404, body: JSON.stringify({ok: false})});
  }
}

// ----------------------------------------------------------------------------------------------------------------------------
exports.setDispatcher = function(d) {
  dispatcher = d;
};

// ----------------------------------------------------------------------------------------------------------------------------
exports.registerHandler = function(selector, handler) {
  handlerFns.push(mkHandlerWrapper(selector, handler));
};

// ----------------------------------------------------------------------------------------------------------------------------
function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

