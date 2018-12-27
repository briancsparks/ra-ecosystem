
const _         = require('lodash');
const utils     = require('../utils');

var handlers = {};

/**
 * Registers a handler for an AWS function.
 *
 * * gatewayApi
 * * lambda
 *
 * @param {*} name
 * @param {*} fn
 */
exports.registerHandler = function(name, fn) {
  handlers[name] = fn;
};


exports.lambda_handler = function(argv, context, callback) {

  if (!utils.getQuiet(context)) { console.log(`ra.lambda_handler`, {argv, context}); }

  // =========================================================================================================
  // AWS Gateway-API -- look for the api-gateway domain name

  if (!utils.getQuiet(context)) { console.log(argv.requestContext); }
  if (!utils.getQuiet(context)) { console.log(argv.requestContext && argv.requestContext.domainName); }
  if (argv.requestContext && argv.requestContext.domainName) {
    let domainName = argv.requestContext.domainName;
    if (!utils.getQuiet(context)) { console.log(domainName, domainName.match(/execute-api/i), domainName.match(/amazonaws[.]com$/i)); }
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

