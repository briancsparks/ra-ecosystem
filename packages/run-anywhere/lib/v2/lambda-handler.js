
const _         = require('lodash');

var handlers = {};

exports.registerHandler = function(name, fn) {
  handlers[name] = fn;
};


exports.lambda_handler = function(argv, context, callback) {

  // =========================================================================================================
  // AWS Gateway-API -- look for the api-gateway domain name
  if (event.requestContext.domainName) {
    let domainName = event.requestContext.domainName;
    if (domainName.match(/execute-api/i) && domainName.match(/amazonaws[.]com$/i)) {
      // AWS Gateway-API
      let handler = handlers.gatewayApi;

      if (_.isFunction(handler)) {
        return handler(argv, context, callback);
      }

      // No handler! Warn
      if ('gatewayApi' in handlers) {
        console.warn(`In runAnywhere.lambda_handler - a gatewayApi handler was registered, but it is not a function.`);
      } else {
        console.warn(`In runAnywhere.lambda_handler - no gatewayApi handler was registered, but a request arrived.`);
      }

      return;
    }
  }

  // =========================================================================================================
  // AWS Lambda -- there are no clues, so must be last
  let handler = handlers.lambda;

  if (_.isFunction(handler)) {
    return handler(argv, context, callback);
  }

  // No handler! Warn
  if ('lambda' in handlers) {
    console.warn(`In runAnywhere.lambda_handler - a Lambda handler was registered, but it is not a function.`);
  } else {
    console.warn(`In runAnywhere.lambda_handler - no Lambda handler was registered, but a request arrived.`);
  }

  return;
};

