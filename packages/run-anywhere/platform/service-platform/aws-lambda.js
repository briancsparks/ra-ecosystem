
const sg                        = require('sg0');
const _                         = require('lodash');
const utils                     = require('./utils');
const inbound                   = require('../platform-utils-inbound');
const {awsLambda}               = inbound;
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('svcplatform', 'awslambda');
const logApiV                   = mkLogApiV('svcplatform', 'awslambda');

var   handlerFns    = [];
var   dispatcher    = dispatch;

exports.lambda    = {};
exports.handler    = {};


// ------------------------------------------------------------------------------------------------------------------------------
// Lambda handler for the function of being the Service Platform
exports.lambda.handler =
exports.handler.lambda =
exports.lambda_svcplatform =
exports.platform_svcplatform =
exports.platform_svcplatform_lambda_handler = function(event, context_, callback) {
  const startTime = new Date().getTime();

  // const event     = normalizeEvent(event_, context_);
  logApiV(`lambda_handler.params`, {event, context:context_});

  // Fix args
  return awsLambda.inboundify(event, context_, function(err, argv, context) {

    return dispatcher(argv, context, function(err, response) {
      const endTime = new Date().getTime();

      const fixedResponse = utils.fixResponse(response);

      logApi(`lambda_handler: (${(endTime - startTime) * 1000})`, {argv, err, response, fixedResponse});

      // OK?
      if (err || !fixedResponse || !fixedResponse.ok) {
        return callback(err, fixedResponse);
      }

      callback(err, fixedResponse);
    });
  });
};







// ------------------------------------------------------------------------------------------------------------------------------
exports.setDispatcher = function(d) {
  dispatcher = d;
};

// ------------------------------------------------------------------------------------------------------------------------------
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
    console.log(`lambda_handler not found`);

    return callback(null, utils.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}

// ------------------------------------------------------------------------------------------------------------------------------
function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}


