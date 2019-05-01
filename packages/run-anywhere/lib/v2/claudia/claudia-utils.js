
// -------------------------------------------------------------------------------------
//  requirements
//
const _                         = require('lodash');
const utils                     = require('../../utils');
const sg                        = utils.sg;
const redisLib                  = require('redis');
const qs                        = require('qs');
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

/**
 * Converts the arguments to the Claudia.JS API handlers into the `argv, context, callback`
 * style that run-anywhere uses.
 *
 * The Claudia.JS `request` object (the first parameter) has a lot of stuff, and the second is
 * the AWS context parameter.
 *
 * Looks through the `request` object, and finds all the JSON-able data, and builds argv out of
 * that, but also adds __request, which is the original request object.
 *
 * So, if `api` is Claudia's `ApiBuilder`, then you would use this function like this:
 *
 * ```js
 *          api.get('/feed', function(...args) {
 *            const [ request, context ]  = args;
 *
 *            var feedData = await getFeed(...claudia2RaArgs(args));
 *          });
 * ```
 *
 * And the `getFeed()` function would get params:
 *
 * ```js
 *          argv = {
 *            all_of_the_json_able_items_from: {url_query, body, path_params}
 *            __meta__: {
 *              __request: 'claudia_js_request_object',
 *              orig: {
 *                queryJson,
 *                bodyJson,
 *                pathParamsJson
 *              }
 *            }
 *          }
 * ```
 *
 * @param {*} args - The standard args (request, context).
 * @param {*} callback - continuation
 *
 * @returns {Array} - [argv, context, callback]
 */
exports.claudia2RaArgs = function(args, callback) {
  checkArgs(args);

  const [ request, context_ ] = args;

  // Parse all sources of params (body, path params)
  const search      = reQuery(request.queryString || (request.proxyRequest && request.proxyRequest.queryStringParameters) || {});
  const query       = qs.parse(search, {ignoreQueryPrefix:true});
  const body        = request.body || {};
  const pathParams  = request.pathParams || {};

  var   argv = {
    ...query,
    ...body,
    ...pathParams,
    __meta__: {
      __request: request,
      orig: {
        query, body, pathParams,
      }
    }
  };

  var   context = {
    claudia       : true,
    ...(context_ || request.lambdaContext || {}),
    __gatewayApi  : request.context,
    __request     : request
  };

  // Here are the args that should get sent to ra-aware fns
  var   raArgs = [argv, context];

  // Add callback, if present
  if (callback) {
    raArgs.push(callback);
  }

  return raArgs;
};

/**
 * Converts the arguments to the Claudia.JS API handlers into the `argv, context, callback`
 * style that run-anywhere uses. But this function allows you to build the `argv` parameter
 * yourself and pass it through.
 *
 * So, if `api` is Claudia's `ApiBuilder`, then you would use this function like this:
 *
 * ```js
 *          api.get('/feed', function(...args) {
 *            const [ request, context ]  = args;
 *
 *            const argv = { Key: request.queryString.Key };
 *
 *            var feedData = await getFeed(...claudia2RaArgs2(argv, args));
 *          });
 * ```
 *
 * @param {*} argv - The standard argv.
 * @param {*} args - The standard args (request, context).
 * @param {*} callback - continuation
 *
 * @returns {Array} - [argv, context, callback]
 */
exports.claudia2RaArgs2 = function(argv, args, callback) {
  const raArgs = exports.claudia2RaArgs(args, callback);

  // Replace with the passed-in argv
  raArgs[0] = {
    __request: raArgs[0].__request,
    ...argv,
  };

  return raArgs;
};


/**
 * Converts the arguments to the Claudia.JS API handlers into the `argv, context, callback`
 * style that run-anywhere uses. But this function allows you to build the `argv` parameter
 * yourself and pass it through.
 *
 * Unlike the other 2 styles, does not put `__request` on the `argv` object.
 *
 * So, if `api` is Claudia's `ApiBuilder`, then you would use this function like this:
 *
 * ```js
 *          api.get('/feed', function(...args) {
 *            const [ request, context ]  = args;
 *
 *            const argv = { Key: request.queryString.Key };
 *
 *            var feedData = await getFeed(...claudia2RaMyArgs(argv, args));
 *          });
 * ```
 *
 * @param {*} argv - The standard argv.
 * @param {*} args - The standard args (request, context).
 * @param {*} callback - continuation
 *
 * @returns {Array} - [argv, context, callback]
 */
 exports.claudia2RaMyArgs = function(argv, args, callback) {
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

function reQuery(queryA) {
  return sg.reduce(queryA, '', (m,v,k) => {
    if (m.length > 0) {
      return '&' + [k,v].join('=');
    }

    return '?' + [k,v].join('=');
  });
}



