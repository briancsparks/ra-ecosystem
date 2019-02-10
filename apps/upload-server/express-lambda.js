
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
const routes                  = require('./express-routes');
const express                 = ra.get3rdPartyLib('express');

const awsServerlessExpress    = ra.get3rdPartyLib('aws-serverless-express')
const awsServerlessExpressMw  = ra.get3rdPartyLib('aws-serverless-express/middleware');

const app                     = express();

// -------------------------------------------------------------------------------------
//  Data
//

// const collNames               = 'clients,sessions,users,telemetry,attrstream,logs'.split(',');
// const dbName                  = process.env.DB_NAME || 'ntl';
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

// Hook into host
app.use(awsServerlessExpressMw.eventContext());
//app.use(ra.raExpressMw(dbName, collNames));

routes.addRoutes(app);


const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes);
exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context)



// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


