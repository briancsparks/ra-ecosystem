

const sg                      = require('sg-flow');
const ra                      = require('run-anywhere').v2;
const awsDefs                 = require('../aws-defs');
const AWS                     = require('aws-sdk');

const mod                     = ra.modSquad(module);

const ec2 = new AWS.EC2({region: 'us-east-1', ...awsDefs.options});


// mod.xport({tag: function(argv, context, callback) {
// }});

