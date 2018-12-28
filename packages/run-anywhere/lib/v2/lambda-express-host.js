'use strict'
const awsServerlessExpress = require('aws-serverless-express')
const app = require('./express-app')
const binaryMimeTypes = [
	'application/octet-stream',
	'font/eot',
	'font/opentype',
	'font/otf',
	'image/jpeg',
	'image/png',
	'image/svg+xml'
]
const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes);

exports.app     = app;
exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context)
