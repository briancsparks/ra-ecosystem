
// -------------------------------------------------------------------------------------
//  requirements
//
const _                         = require('lodash');
const utils                     = require('../../utils');
const sg                        = utils.sg;
const redisLib                  = require('redis');
const { registerSanityChecks }  = require('../sanity-checks');

const {
  getQuiet, raContext, inspect,
}                               = utils;

// -------------------------------------------------------------------------------------
//  Data
//

// var   sanityChecks            = [];


// -------------------------------------------------------------------------------------
//  Functions
//

exports.claudia2RaArgs = function(args, callback) {
  checkArgs(args);

  const [ request, context_ ] = args;

  // TODO: parse all sources of params (body, path params)
  var   argv = {
    __request: request,
    ...sg.extend(request.queryStringParameters),
  };

  var   context = {
    ...(context_ || request.lambdaContext || {}),
    gatewayApi  : request.context,
    request     : request
  };

  // Here are the args that should get sent to ra-aware fns
  var   raArgs = [argv, context];

  // Add callback, if present
  if (callback) {
    raArgs.push(callback);
  }

  return raArgs;
};

exports.claudia2RaArgs2 = function(argv, args, callback) {
  const raArgs = exports.claudia2RaArgs(args, callback);

  // Replace with the passed-in argv
  raArgs[0] = argv;

  return raArgs;
};

  // -------------------------------------------------------------------------------------
//  Helper functions
//

// registerSanityChecks(module, __filename, sanityChecks);


function checkArgs(args) {
  if (args.length !== 2) {
    console.warn(`WWWW Checking claudia args: args.length !== 2, is: ${args.length}`, inspect({args}));
  }
}
