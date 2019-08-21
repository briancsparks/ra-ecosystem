
const _                         = require('lodash');


var   handlerFns    = [];
var   dispatcher    = dispatch;

exports.platform_host_lambda_handler = function(event, context, callback) {

  return dispatch(event, context, callback);
};

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
  }
}


function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

