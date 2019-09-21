
const sg                        = require('sg0');
const _                         = require('lodash');
const utils                     = require('./utils');


var   handlerFns    = [];
var   dispatcher    = dispatch;

// -----------------------------------------------------------------

// Lambda handler for the function of being the host
exports.platform_host_lambda_handler = function(event, context, callback) {
  const startTime = new Date().getTime();
  const onEntry = {
    event     : JSON.parse(JSON.stringify(event)),
    context   : JSON.parse(JSON.stringify(context)),
  };

  return dispatcher(event, context, function(err, response) {
    const endTime = new Date().getTime();

    const fixedResponse = utils.fixResponse(response);

    sg.log(`RA_Host.lambda_handler: (${(endTime - startTime) * 1000})`, {event, err, response, fixedResponse});

    // OK?
    if (err || !response || !response.ok) {
      return callback(err, fixedResponse);
    }

    callback(err, fixedResponse);
  });
};


// -----------------------------------------------------------------

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

    return callback(null, utils.fixResponse({statusCode: 404, body: {ok: false}}));
  }
}


function mkHandlerWrapper(select, handleIt) {
  return {select, handleIt};
}

