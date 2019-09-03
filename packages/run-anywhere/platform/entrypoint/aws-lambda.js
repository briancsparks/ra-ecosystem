
const _                         = require('lodash');

var   handlerFns    = [];

exports.platform_entrypoint_lambda_handler = function(event, context, callback) {
  return dispatch(event, context, callback);
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
    console.log(`lambda_handler not found while dispatching from the platform entrypoint.`);
  }
}

function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

