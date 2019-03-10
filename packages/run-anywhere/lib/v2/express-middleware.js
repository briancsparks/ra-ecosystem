
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;
const libAwsServerlessExpress    = require('aws-serverless-express');
const libAwsServerlessExpressMw  = require('aws-serverless-express/middleware');


// -------------------------------------------------------------------------------------
//  Data
//

const binaryMimeTypes = [
	'application/octet-stream',
	'font/eot',
	'font/opentype',
	'font/otf',
	'image/jpeg',
	'image/png',
	'image/svg+xml'
];



// -------------------------------------------------------------------------------------
//  Functions
//

var   lib = {};

lib.awsServerlessExpress = function(app, arg2, callerBinaryMimeTypes, ...rest) {

  app.use(libAwsServerlessExpressMw.eventContext());

  const server = libAwsServerlessExpressMw.createServer(app, arg2, callerBinaryMimeTypes || binaryMimeTypes, ...rest);

  const handler = (event, context) => libAwsServerlessExpressMw.proxy(server, event, context);
  return handler;
};

exports.expressMiddleware = function(options={}) {

  return lib;
};


// -------------------------------------------------------------------------------------
//  Helper Functions
//


