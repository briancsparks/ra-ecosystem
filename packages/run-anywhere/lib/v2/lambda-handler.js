

// -------------------------------------------------------------------------------------
//  requirements
//

const sg                          = require('sg-config');
const _                           = require('lodash');
const utils                       = require('../utils');
const { reportWarning }           = require('../error-handlers');
const { inspect }                 = utils;

// -------------------------------------------------------------------------------------
//  Data
//

var   handlers      = {};
var   handlerFns    = [];

// -------------------------------------------------------------------------------------
//  Functions
//

exports.lambda_handler = function(event, context, callback) {

  if (!utils.getQuiet(context)) { console.log(`ra.lambda_handler`, inspect({event, context})); }

  var handled = false;
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

  // TODO: putttt back
  // if (!handled) {
  //   return reportWarning({log:[`Cannot determine source for event`, {event}]}, context, callback);
  // }

  // return callback();
};

const mkHandlerWrapper = function(select, handleIt) {
  return {select, handleIt};
};

exports.registerHandler = function(select, handleIt) {
  handlerFns.push(mkHandlerWrapper(select, handleIt));
};

exports.expressServerlessRoutes = function(subdomainName, handler /*, appBuilder*/) {
  exports.registerHandler(function(event, context) {

    console.log(`expressServerlessRoutes ${subdomainName}`, event.requestContext && event.requestContext.domainName);

    if (event.requestContext && event.requestContext.domainName) {
      let domainName = event.requestContext.domainName;

      if (domainName.match(/execute-api/i) && domainName.match(/amazonaws[.]com$/i)) {
        if (domainName.indexOf(subdomainName) !== -1) {
          if (!utils.getDQuiet(context)) { console.log(`DDDSending request to handler for express sub-domain: ${subdomainName}`); }
          if (!utils.getQuiet(context)) { console.log(`Sending request to handler for express sub-domain: ${subdomainName}`); }
          return true;
        }
      }
    }

    if (!utils.getQuiet(context)) { console.log(`NOT Sending request to handler for express sub-domain: ${subdomainName}`); }
    return false;
  },
  function(event, context_, callback) {
    const context = sg.merge(context_, {expressServerless:true, awsApiGateway:true});
    return handler(event, context, callback);
  });
};

exports.claudiaServerlessApi = function(subdomainName, handler) {
  exports.registerHandler(function(event, context) {

    console.log(`claudiaServerlessApi ${subdomainName}`, event.requestContext && event.requestContext.domainName);

    if (event.requestContext && event.requestContext.domainName) {
      let domainName = event.requestContext.domainName;

      if (domainName.match(/execute-api/i) && domainName.match(/amazonaws[.]com$/i)) {
        if (domainName.indexOf(subdomainName) !== -1) {

          if (handler) {
            if (!utils.getDQuiet(context)) { console.log(`DDDSending request to handler for gatewayApi sub-domain: ${subdomainName}`); }
            if (!utils.getQuiet(context)) { console.log(`Sending request to handler for gatewayApi sub-domain: ${subdomainName}`); }
            return true;

          } else {
            if (!utils.getQuiet(context)) { console.log(`NOT Sending request to handler for gatewayApi sub-domain, even though we know subdomain: ${subdomainName}`); }
              return false;
          }
        }
      }
    }

    if (!utils.getQuiet(context)) { console.log(`NOT Sending request to handler for gatewayApi sub-domain: ${subdomainName}`); }
    return false;
  },
  function(event, context_, callback) {
    const context = sg.merge(context_, {claudia:true, awsApiGateway:true});
    return handler(event, context, callback);
  });
};


// -------------------------------------------------------------------------------------
//  Helper functions
//

