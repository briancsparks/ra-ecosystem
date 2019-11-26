
/**
 * @file
 *
 * Utilities to help handle things as they are inbound.
 *
 *
 */
const sg0                       = require('sg-argv');
const sg                        = sg0.merge(sg0, require('@sg0/sg-smart-value'), require('sg-http'), require('sg-env'));
const {_}                       = sg;
const platform                  = require('./platform-utils');
const awsUtils                  = require('./platform-utils-aws');
const reqResUtils               = require('./platform-utils-req-res');
const instanceUtils             = require('./platform-utils-instance');
const ARGVUtils                 = require('./platform-utils-ARGV');
const {noop,
       asErr,
       fixResponse}             = platform;


module.exports.reqRes                       = {};
module.exports.awsLambda                    = {};
module.exports.template                     = {};
module.exports.cliWorkstation               = {};
module.exports.workstation                  = {};
module.exports.cli                          = {};


module.exports.reqRes.inboundify            = reqRes_inboundify;
module.exports.awsLambda.inboundify         = awsLambda_inboundify;
module.exports.template.inboundify          = mkInboundify('template', 'template');
module.exports.cliWorkstation.inboundify    = mkInboundify('cli', 'workstation');


module.exports.reqRes.fixResponse           = fixResponse;
module.exports.awsLambda.fixResponse        = fixResponse;
module.exports.template.fixResponse         = fixResponse;
module.exports.workstation.fixResponse      = fixResponse;


module.exports.argvify                      = argvify;
module.exports.reqRes.argvify               = module.exports.argvify_reqRes         = argvify_reqRes;
module.exports.awsLambda.argvify            = module.exports.argvify_awsLambda      = argvify_awsLambda;
module.exports.template.argvify             = module.exports.argvify_template       = platform.argvify;
module.exports.cli.argvify                  = module.exports.argvify_cli            = argvify_cli;
module.exports.argvify_smart                = platform.argvify_smart;

module.exports.contextify                   = contextify;
module.exports.reqRes.contextify            = module.exports.contextify_reqRes      = contextify_reqRes;
module.exports.awsLambda.contextify         = module.exports.contextify_awsLambda   = platform.contextify_Xyz;
module.exports.template.contextify          = module.exports.contextify_template    = platform.contextify_Xyz;
module.exports.workstation.contextify       = module.exports.contextify_workstation = platform.contextify_Xyz;
module.exports.contextify_smart             = platform.contextify_smart;


module.exports.fixResponse                  = fixResponse;


// ------------------------------------------------------------------------------------------------------------------------------
function mkInboundify(epModname, hostModname) {
  const epMod     = module.exports[epModname];
  const hostMod   = module.exports[hostModname];

  return function(event, context_, callback =noop) {
    return epMod.argvify(event, context_, function(errArgvify, argv, context_) {
      return hostMod.contextify(argv, context_, function(errContextify, argv_, context) {

        return callback(asErr({errArgvify, errContextify}), argv, context);
      });
    });
  };
}

// ------------------------------------------------------------------------------------------------------------------------------
function awsLambda_inboundify(event, context_, callback =noop) {
  return argvify_awsLambda(event, context_, function(errArgvify, argv, context_) {
    return module.exports.awsLambda.contextify(argv, context_, function(errContextify, argv_, context) {

      return callback(asErr({errArgvify, errContextify}), argv, context);
    });
  });
}

// ------------------------------------------------------------------------------------------------------------------------------
function reqRes_inboundify(event, context_, callback =noop) {
  return argvify_reqRes(event, context_, function(errArgvify, argv, context_) {
    return contextify_reqRes(argv, context_, function(errContextify, argv_, context) {

      return callback(asErr({errArgvify, errContextify}), argv, context);
    });
  });
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify_awsLambda(event_, context, callback =noop) {
  return awsUtils.argvify(event_, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify_cli(event, context, callback =noop) {
  return instanceUtils.argvify(event, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify_reqRes(event, context, callback =noop) {
  return reqResUtils.argvify(event, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify_reqRes(argv, context, ...rest) {
  return platform.contextify_Xyz(argv, context, ...rest);
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify(query_, body_, headers_, extras, path_, method_, stage, event_, context) {
  return platform.argvify(query_, body_, headers_, extras, path_, method_, stage, event_, context);
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify(argv, context, event) {
  return platform.contextify(argv, context, event);
}


