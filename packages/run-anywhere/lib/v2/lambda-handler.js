

// -------------------------------------------------------------------------------------
//  requirements
//

const _                           = require('lodash');
const utils                       = require('../utils');
const { registerSanityChecks }    = require('./sanity-checks');
const { inspect }                 = utils;

// -------------------------------------------------------------------------------------
//  Data
//

var   sanityChecks  = [];
var   handlers      = {};
var   handlerFns    = [];

// -------------------------------------------------------------------------------------
//  Functions
//

exports.lambda_handler = function(event, context, callback) {

  console.log(`ra.lambda_handler`, inspect({event, context}));
  if (!utils.getQuiet(context)) { console.log(`ra.lambda_handler`, inspect({event, context})); }

  if (!utils.getQuiet(context)) { console.log(inspect(event.requestContext)); }
  if (!utils.getQuiet(context)) { console.log(event.requestContext && event.requestContext.domainName); }

  var handled = false;
  _.each(handlerFns, (handler) => {
    if (handled) { return; }

    if (handler.select(event, context)) {
      handled = true;
      return handler.handleIt(event, context, callback);
    }
  });

  return;
};

const mkHandlerWrapper = function(select, handleIt) {
  return {select, handleIt};
};

exports.registerHandler = function(select, handleIt) {
  handlerFns.push(mkHandlerWrapper(select, handleIt));
};

exports.expressServerlessRoutes = function(subdomainName, appBuilder) {
  const lambdaExpressHost       = require('./lambda-express-host');

  appBuilder(lambdaExpressHost.app);

  exports.registerHandler(function(event, context) {

    if (!utils.getQuiet(context)) { console.log(inspect(event.requestContext)); }
    if (!utils.getQuiet(context)) { console.log(event.requestContext && event.requestContext.domainName); }

    if (event.requestContext && event.requestContext.domainName) {
      let domainName = event.requestContext.domainName;
      if (!utils.getQuiet(context)) { console.log(domainName, domainName.match(/execute-api/i), domainName.match(/amazonaws[.]com$/i)); }

      if (domainName.match(/execute-api/i) && domainName.match(/amazonaws[.]com$/i)) {
        if (domainName.indexOf(subdomainName) !== -1) {
          return true;
        }
      }
    }

    return false;
  },
  function(event, context, callback) {
    return lambdaExpressHost.handler(event, context, callback);
  });
};

exports.claudiaServerlessApi = function(subdomainName, handler) {
  exports.registerHandler(function(event, context) {

    if (!utils.getQuiet(context)) { console.log(inspect(event.requestContext)); }
    if (!utils.getQuiet(context)) { console.log(event.requestContext && event.requestContext.domainName); }

    if (event.requestContext && event.requestContext.domainName) {
      let domainName = event.requestContext.domainName;
      if (!utils.getQuiet(context)) { console.log(domainName, domainName.match(/execute-api/i), domainName.match(/amazonaws[.]com$/i)); }

      if (domainName.match(/execute-api/i) && domainName.match(/amazonaws[.]com$/i)) {
        if (domainName.indexOf(subdomainName) !== -1) {
          return true;
        }
      }
    }

    return false;
  },
  function(event, context, callback) {
    return handler(event, context, callback);
  });
};


exports.lambda_handlerX = function(event, context, callback) {

  if (!utils.getQuiet(context)) { console.log(`ra.lambda_handler`, {event, context}); }

  // =========================================================================================================
  // AWS Gateway-API -- look for the api-gateway domain name

  if (!utils.getQuiet(context)) { console.log(event.requestContext); }
  if (!utils.getQuiet(context)) { console.log(event.requestContext && event.requestContext.domainName); }
  if (event.requestContext && event.requestContext.domainName) {
    let domainName = event.requestContext.domainName;
    if (!utils.getQuiet(context)) { console.log(domainName, domainName.match(/execute-api/i), domainName.match(/amazonaws[.]com$/i)); }
    if (domainName.match(/execute-api/i) && domainName.match(/amazonaws[.]com$/i)) {
      // AWS Gateway-API
      let handler = handlers.gatewayApi;

      if (_.isFunction(handler)) {
        return handler(event, context, callback);
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
  // AWS Gateway-API -- look for the api-gateway domain name

  // =========================================================================================================
  // AWS Lambda -- there are no clues, so must be last
  let handler = handlers.lambda;

  if (_.isFunction(handler)) {
    return handler(event, context, callback);
  }

  // No handler! Warn
  if ('lambda' in handlers) {
    console.warn(`In runAnywhere.lambda_handler - a Lambda handler was registered, but it is not a function.`);
  } else {
    console.warn(`In runAnywhere.lambda_handler - no Lambda handler was registered, but a request arrived.`);
  }

  return;
};







/**
 * Registers a handler for an AWS function.
 *
 * * gatewayApi
 * * lambda
 *
 * @param {*} name
 * @param {*} fn
 */
exports.registerHandlerX = function(name, fn) {
  handlers[name] = fn;
};
sanityChecks.push(async function({assert, ...context}) {
  exports.registerHandler('foo', function(){});

  return `registerHandler()`;
});

registerSanityChecks(module, __filename, sanityChecks);

// -------------------------------------------------------------------------------------
//  Helper functions
//

