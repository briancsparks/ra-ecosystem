if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const awsLambda = require('./api-gateway');

awsLambda.platform_entrypoint_lambda_handler = awsLambda.platform_entrypoint_apigateway_lambda_handler;

module.exports = awsLambda;
exports.handler    = {};
