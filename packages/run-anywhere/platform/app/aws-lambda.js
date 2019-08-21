
const entrypoint              = require('../entrypoint/aws-lambda');
const host                    = require('../host/aws-lambda');

exports.handler = entrypoint.platform_entrypoint_lambda_handler;

entrypoint.registerHandler(() => true, host.platform_host_lambda_handler);

host.setDispatcher(function(event, context, callback) {
});

