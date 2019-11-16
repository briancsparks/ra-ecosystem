
const awsUtils                  = require('./platform-utils-aws');
const nginxUtils                = require('./platform-utils-nginx');

module.exports.apiGatewayProxy              = {};
module.exports.nginxRpxi                    = {};

module.exports.nginxRpxi.fixResponse        = nginxUtils.fixResponse_rpxi;

module.exports.apiGatewayProxy.fixResponse  = awsUtils.fixResponse_apiGatewayProxy;

