
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

// -------------------------------------------------------------------------------------
//  Data
//



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

  return url.query;
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

  var   ezHeaders = sg.reduce(req.headers, {}, (m, value, k) => {
    const key = k.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    return sg.kv(m, key, value);
  });

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
  _.extend(query, url.query);

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

// --------------------------------------------------------------------
exports._200 = function(req, res, result_, dbg) {
  var result = {code:200, ok:true, ...result_, ...sg.debugInfo(dbg)};

  console.log(`200 for ${req.url}`, sg.inspect({result}));

  const strResult = JSON.stringify(result);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);

  // console.log(`200 for ${req.url}`, sg.inspect({result}));
};

// --------------------------------------------------------------------
exports._400 = function(req, res, err, dbg) {
  var result = {code:400, ok:false, ...sg.debugInfo(dbg)};

  console.error(`400 for ${req.url}`, sg.inspect({result, err}));

  if (sg.modes().debug) {
    result.error = err;
  }

  const strResult = JSON.stringify(result);
  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);
};

// --------------------------------------------------------------------
exports._500 = function(req, res, err, dbg) {
  var result = {code:500, ok:false, ...sg.debugInfo(dbg)};

  console.error(`500 for ${req.url}`, sg.inspect({result, err}));

  if (sg.modes().debug) {
    result.error = err;
  }

  const strResult = JSON.stringify(result);
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);
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



// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//

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


