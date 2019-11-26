if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const apigateway = require('./api-gateway');


exports.awsLambda      = {};

exports.awsLambda.lambda_handler        = apigateway.lambda_handler;
exports.awsLambda.handler               = apigateway.handler;
exports.awsLambda.setDispatcher         = apigateway.setDispatcher;
exports.awsLambda.registerHandler       = apigateway.registerHandler;


