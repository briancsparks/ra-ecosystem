
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const libUrl                  = require('url');
const qs                      = require('qs');
const { omitDebug }           = ra;

// -------------------------------------------------------------------------------------
//  Data
//

const AWS_ACCT_TYPE           = (process.env.AWS_ACCT_TYPE || '').toUpperCase();
const NETLAB_PRIVATE_APIKEY   = process.env[`NETLAB_PRIVATE_APIKEY_${AWS_ACCT_TYPE}`];

// -------------------------------------------------------------------------------------
//  Functions
//

// --------------------------------------------------------------------
/**
 *  Gets the raw (Buffer) body of the request.
 *
 * @param {*} req       - The request object.
 * @param {*} callback  - The callback
 *
 * @returns {Buffer[]}  - The list of buffer chunks that make up the body.
 */
exports.getRawBody = function(req, callback) {

  // req.end might have already been called
  if (req.bufferChunks) {
    return callback(null, req.bufferChunks);
  }

  const onEnd = function() {
    req.bufferChunks = req.bufferChunks || Buffer.concat(req.rawChunks);
    return callback(null, req.bufferChunks);
  };

  req.on('end', onEnd);

  // Only collect the data once
  if (req.rawChunks) {
    return;
  }

  /* otherwise */
  req.rawChunks = [];
  req.on('data', function(chunk) {
    req.rawChunks.push(chunk);
  });
};

// --------------------------------------------------------------------
/**
 * Turns the body into JSON.
 *
 * @param {*} req - The request object
 *
 * @returns {string} - The JSON from parsing the body.
 */
exports.decodeJSONBody = function(req) {
  var bodyStr;

  if (req.body) {
    if (typeof req.body === 'string') {
      bodyStr = req.body;
    }

    if (typeof req.body === 'object') {
      return req.body;
    }
  }

  if (req.bufferChunks) {
    const apiGateway        = req.apiGateway                        || {};
    const event             = apiGateway.event                      || {};

    var stringBuffer = req.bufferChunks;
    if (event.isBase64Encoded) {
      stringBuffer = Buffer.from(req.bufferChunks, 'base64');
    }

    bodyStr = stringBuffer.toString();
  }

  if (bodyStr) {
    return (req.body = sg.safeJSONParse(bodyStr));
  }
};

// --------------------------------------------------------------------
/**
 * Gets the parameters that are available on first server request, so
 * no body, and a callback is not needed.
 *
 * @param {*} req - The request object.
 * @param {*} res - The response object.
 *
 * @returns {Object}  - All params that can be determined.
 */
exports.initialReqParams = function(req, res) {
  const url   = libUrl.parse(req.url, true);

  // _.extend(query, url.query);
  return qs.parse(url.search, {ignoreQueryPrefix:true, allowDots:true});
};

// -------------------------------------------------------------------------------------
/**
 *  Gets all stuff from the request object.
 *
 * @param {*} req - The request object.
 * @param {function} normalizeBodyFn - The fn to build up the result.
 *
 * @returns {Object} - All of the parameters that could be found for the request.
 */
module.exports.getReqParams = function(req, normalizeBodyFn = _.identity) {

  const url       = libUrl.parse(req.originalUrl, true);

  // These are the parameters that are returned (along with headers, ezHeaders)
  var   event, context, body, query, orig_path, stage, real_ip, protocol, host, pathname, search;

  var   headers   = {...req.headers};

  var   ezHeaders = mkEzHeaders(req);

  // Get parameters, event, context from API Gateway
  const apiGateway        = req.apiGateway                        || {};

        event             = apiGateway.event                      || {};
        query             = event.queryStringParameters           || {};
  const requestContext    = event.requestContext                  || {};
        orig_path         = req.originalUrl                       || requestContext.path;
        context           = apiGateway.context                    || {};
        stage             = getEnvName(req);
        real_ip           = ezHeaders.x_real_ip                   || (ezHeaders.x_forwarded_for || '').split(', ')[0]
                                                                  || sg.deref(requestContext, ['identity', 'sourceIp']);
  // _.extend(query, url.query);
  _.extend(query, qs.parse(url.search, {ignoreQueryPrefix:true, allowDots:true}));

        host              = url.host                              || headers.host || '';
        pathname          = url.pathname                          || orig_path;
        search            = url.search                            || makeSearch(query)    || '';

        protocol          = colonify(url.protocol  || ezHeaders.x_forwarded_proto  || ezHeaders.cloudfront_forwarded_proto || 'http');

        body              = normalizeBodyFn(req.body || {}, {}, query || url.query || {});

  var reqParams = {
    platform: {
      /* complex  */ event, context,
      /* names    */ stage, real_ip,
    },

    http: {
      /* headers  */ headers, ezHeaders,
      /* req data */ body, query, orig_path,
      /* urlparts */ protocol, host, pathname, search
    }
  };

  // Join all the param sources
  reqParams.argvEx = reqParams.http.all = {...reqParams.http.body, ...reqParams.http.query, headers: ezHeaders, protocol, host};
  reqParams.argv                        = {...reqParams.http.body, ...reqParams.http.query};

  return reqParams;
};

// -------------------------------------------------------------------------------------
/**
 *  Gets stuff that is usually gotten from the req/res (HTTP) elements.
 *
 * @param {*} req - The request object.
 * @param {function} normalizeBodyFn - The fn to build up the result.
 *
 * @returns {Object} - All of the parameters that could be found for the request.
 */
exports.getHttpParams = module.exports.getHttpParams = function(req, normalizeBodyFn = _.identity) {

  const url       = libUrl.parse(req.originalUrl, true);

  // These are the parameters that are returned (along with headers, ezHeaders)
  var   event, context, body, query, orig_path, stage, real_ip, protocol, host, pathname, search;

  var   headers   = {...req.headers};

  var   ezHeaders = mkEzHeaders(req);

  // Get parameters, event, context from API Gateway
  const apiGateway        = req.apiGateway                        || {};

        event             = apiGateway.event                      || {};
        query             = event.queryStringParameters           || {};
  const requestContext    = event.requestContext                  || {};
        orig_path         = req.originalUrl                       || requestContext.path;
        context           = apiGateway.context                    || {};
        stage             = getEnvName(req);
        real_ip           = ezHeaders.x_real_ip                   || (ezHeaders.x_forwarded_for || '').split(', ')[0]
                                                                  || sg.deref(requestContext, ['identity', 'sourceIp']);
  // _.extend(query, url.query);
  _.extend(query, qs.parse(url.search, {ignoreQueryPrefix:true, allowDots:true}));

        host              = url.host                              || headers.host || '';
        pathname          = url.pathname                          || orig_path;
        search            = url.search                            || makeSearch(query)    || '';

        protocol          = colonify(url.protocol  || ezHeaders.x_forwarded_proto  || ezHeaders.cloudfront_forwarded_proto || 'http');

        body              = normalizeBodyFn(req.body || {}, {}, query || url.query || {});

  var   httpParams = {
    /* complex  */ event, context,
    /* headers  */ headers, ezHeaders,
    /* req data */ body, query, orig_path,
    /* names    */ stage, real_ip,
    /* urlparts */ protocol, host, pathname, search
  };

  httpParams.argv = httpParams.all = {...httpParams, ...httpParams.body, ...httpParams.query};

  return httpParams;
};

exports.superagentPodResponse = function(response) {
  return _.pick(response, 'text,body,header,type,charset,status,statusType,info,ok,clientError,serverError,accepted,noContent,badRequest,unauthorized,notAcceptable,notFound,forbidden'.split(','));
};

exports.superagentPodErr = function(err) {
  if (!err)   { return err; }
  return {
    status:   err.status,
    response: _.pick(err.response, 'text,body,header,type,charset,status,statusType,info,ok,clientError,serverError,accepted,noContent,badRequest,unauthorized,notAcceptable,notFound,forbidden'.split(','))
  };
};

// --------------------------------------------------------------------
var responders = {};

// --------------------------------------------------------------------
responders[200] =
exports._200 = function(req, res, result_, dbg) {
  var result = {code:200, ok:true, ...result_, ...sg.debugInfo(dbg)};

  if (sg.modes().debug) {
    console.log(`200 for ${req.url}`, sg.inspect({result: sg.small(result)}));
  }

  const strResult = JSON.stringify(result);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);

  // console.log(`200 for ${req.url}`, sg.inspect({result}));
};

// --------------------------------------------------------------------
exports._4XX = function(code, req, res, err, dbg) {
  var result = {code, ok:false, ...sg.debugInfo(dbg)};

  console.error(`${code} for ${req.url}`, sg.inspect({result: sg.small(result), err}));

  if (sg.modes().debug) {
    result.error = err;
  }

  const strResult = JSON.stringify(result);
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);
};

responders[400] =
exports._400 = function(req, res, err, dbg) {
  return exports._4XX(400, req, res, err, dbg);
};

responders[401] = exports._401 = function(...args) { return exports._4XX(401, ...args); };
responders[403] = exports._403 = function(...args) { return exports._4XX(403, ...args); };
responders[404] = exports._404 = function(...args) { return exports._4XX(404, ...args); };

// --------------------------------------------------------------------
exports._5XX = function(code, req, res, err, dbg) {
  var result = {code, ok:false, ...sg.debugInfo(dbg)};

  console.error(`${code} for ${req.url}`, sg.inspect({result: sg.small(result), err}));

  if (sg.modes().debug) {
    result.error = err;
  }

  const strResult = JSON.stringify(result);
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);
};

responders[500] =
exports._500 = function(req, res, err, dbg) {
  return exports._5XX(500, req, res, err, dbg);
};

responders[503] = exports._503 = function(...args) { return exports._5XX(503, ...args); };


const mkResponse =
exports.mkResponse = function(code, ...rest) {
  const responder = responders[code] || exports._400;
  return responder(...rest);
};

// --------------------------------------------------------------------
const getEnvName =
exports.getEnvName = function(req) {
  var   result;

  const apiGateway    = req.apiGateway                        || {};
  const context       = apiGateway.context                    || {};
  const fnArn         = context.invokedFunctionArn;

  if (fnArn) {
    let envName       = _.last(fnArn.split(':'));
    if (envName === 'latest') {
      envName = 'dev';
    }

    result = envName;
  }

  return result;
};

exports.jsonApiEx = function(mod, fnFilename, checkNum, name, calledLib, calledFnName, defs={}) {
  return mod.reqHandler({[name]: function(req, res) {
    const start = _.now();

    sg.check(checkNum, fnFilename, {req}, {res}, 'runAnywhere.context');
    console.log(`[express]/${name} invoked ${req.url}`);

    const { rax }         = ra.getContext(req.runAnywhere.context, {});
    return rax.iwrap2(function( /* abort */ ) {
      const mods            = rax.invokers(calledLib, calledFnName);
      const calledFunction  = mods[sg.firstKey(mods)];

      if (!calledFunction) {
        let msg = `Cannot find ${calledFnName} while trying to jsonApiEx (have: ${Object.keys(calledLib.async)})`;
        sg.warn(msg);
        return exports.mkResponse(500, req, res, {msg}, {msg});
      }

      const reqParams           = exports.getReqParams(req, sg.merge);
      console.log(`jsonApiEx ${req.url}`, sg.inspect({reqParams}));
      const { argvEx }          = reqParams;

      return calledFunction({...defs, ...argvEx}, function(err, result) {
        console.log(`[express]${req.url} 200 ${_.now() - start}`);
        return exports._200(req, res, result);
      });
    });
  }});
};

exports.jsonApi = function(mod, fnFilename, checkNum, name, calledLib, calledFnName, defs={}) {
  return mod.reqHandler({[name]: function(req, res) {
    const start = _.now();

    sg.check(checkNum, fnFilename, {req}, {res}, 'runAnywhere.context');
    console.log(`[express]/${name} invoked ${req.url}`);

    const { rax }         = ra.getContext(req.runAnywhere.context, {});
    return rax.iwrap2(function( /* abort */ ) {
      const mods            = rax.invokers(calledLib, calledFnName, {cleanArgv:true});
      const calledFunction  = mods[sg.firstKey(mods)];

      if (!calledFunction) {
        let msg = `Cannot find ${calledFnName} while trying to jsonApi (have: ${Object.keys(calledLib.async)})`;
        sg.warn(msg);
        return exports.mkResponse(500, req, res, {msg}, {msg});
      }

      const reqParams           = exports.getReqParams(req, sg.merge);
      var   { argv, argvEx }    = reqParams;

      argvEx                    = omitDebug(argvEx);

      return calledFunction({...defs, ...argv}, function(err, result) {
        console.log(`[express]${req.url} 200 ${_.now() - start}`);
        return exports._200(req, res, result);
      });
    });
  }});
};

// -------------------------------------------------------------------------------------
// exports
//

exports.protectRouteMw = protectRouteMw;


// -------------------------------------------------------------------------------------
//  Helper Functions
//

function protectRouteMw(options={}) {
  return function(req, res, next) {

    const headers = mkEzHeaders(req);

    if (NETLAB_PRIVATE_APIKEY && headers.x_api_key === NETLAB_PRIVATE_APIKEY) {
      return next();
    }

    sg.elog(`protectRouteMw fail api key`, {"x-api-key": headers.x_api_key});

    return mkResponse(403, req, res);
  };
}

function colonify(protocol) {
  if (!protocol.endsWith(':')) {
    return protocol + ':';
  }
  return protocol;
}

function makeSearch(query = {}) {
  const str = sg.reduce(query, [], (arr,v,k) => {
    return [...arr, _.compact([k,v]).join('=')];
  }).join('&');

  return ['', ..._.compact([str])].join('?');
}

function mkEzHeaders(req) {
  return sg.reduce(req.headers, {}, (m, value, k) => {
    const key = k.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    return sg.kv(m, key, value);
  });
}



