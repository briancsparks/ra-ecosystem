
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

const inspect                 = sg.inspect;
const isDebug                 = sg.isDebug;

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

/**
 * Gets the parameters that are available on first server request, so, no callback,
 * and no body.
 *
 * @param {*} req
 * @param {*} res
 */
exports.initialReqParams = function(req, res) {
  const url   = libUrl.parse(req.url, true);

  return url.query;
};

exports._200 = function(req, res, result_) {
  var result = {code:200, ok:true, ...result_};

  console.log(`200 for ${req.url}`, inspect({result}));

  const strResult = JSON.stringify(result);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);

  console.log(`200 for ${req.url}`, inspect({result}));
};

exports._400 = function(req, res, err) {
  var result = {code:400, ok:false};

  console.error(`400 for ${req.url}`, inspect({result, err}));

  if (isDebug()) {
    result.error = err;
  }

  const strResult = JSON.stringify(result);
  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);
};

exports._500 = function(req, res, err) {
  var result = {code:500, ok:false};

  console.error(`500 for ${req.url}`, inspect({result, err}));

  if (isDebug()) {
    result.error = err;
  }

  const strResult = JSON.stringify(result);
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', strResult.length);
  res.end(strResult);
};

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
}



// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


