

// -------------------------------------------------------------------------------------
//  requirements
//

const _                           = require('lodash');
const utils                       = require('../utils');
const { reportWarning }           = require('../error-handlers');
// const { registerSanityChecks }    = require('./sanity-checks');
const { inspect }                 = utils;

// -------------------------------------------------------------------------------------
//  Data
//

// var   sanityChecks  = [];
var   handlers      = {};
var   handlerFns    = [];

// -------------------------------------------------------------------------------------
//  Functions
//

exports.lambda_handler = function(event, context, callback) {

  // if (!utils.getQuiet(context)) { console.log(`ra.lambda_handler`, inspect({event, context})); }

  var handled = false;
  _.each(handlerFns, (handler) => {
    if (handled) { return; }

    if (handler.select(event, context)) {
      handled = true;
      return handler.handleIt(event, context, callback);
    }
  });

  if (!handled) {
    return reportWarning({log:[`Cannot determine source for event`, {event}]}, context, callback);
  }

  return callback();
};

const mkHandlerWrapper = function(select, handleIt) {
  return {select, handleIt};
};

exports.registerHandler = function(select, handleIt) {
  handlerFns.push(mkHandlerWrapper(select, handleIt));
};

exports.expressServerlessRoutes = function(subdomainName, handler /*, appBuilder*/) {
  exports.registerHandler(function(event, context) {

    if (event.requestContext && event.requestContext.domainName) {
      let domainName = event.requestContext.domainName;

      if (domainName.match(/execute-api/i) && domainName.match(/amazonaws[.]com$/i)) {
        if (domainName.indexOf(subdomainName) !== -1) {
          // if (!utils.getQuiet(context)) { console.log(`Sending request to handler for express sub-domain: ${subdomainName}`); }
          return true;
        }
      }
    }

    // if (!utils.getQuiet(context)) { console.log(`NOT Sending request to handler for express sub-domain: ${subdomainName}`); }
    return false;
  },
  function(event, context, callback) {
    return handler(event, context, callback);
  });
};

exports.claudiaServerlessApi = function(subdomainName, handler) {
  exports.registerHandler(function(event, context) {

    if (event.requestContext && event.requestContext.domainName) {
      let domainName = event.requestContext.domainName;

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


// registerSanityChecks(module, __filename, sanityChecks);

// -------------------------------------------------------------------------------------
//  Helper functions
//

