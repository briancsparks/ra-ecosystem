
const awsUtils                  = require('./platform-utils-aws');
const nginxUtils                = require('./platform-utils-nginx');
const cliUtils                  = require('./platform-utils-cli');

module.exports.apiGatewayProxy              = {};
module.exports.nginxRpxi                    = {};
module.exports.cli                          = {};

module.exports.nginxRpxi.fixResponse        = nginxUtils.fixResponse_rpxi;
module.exports.apiGatewayProxy.fixResponse  = awsUtils.fixResponse_apiGatewayProxy;
module.exports.cli.fixResponse              = cliUtils.fixResponse_stdout;

