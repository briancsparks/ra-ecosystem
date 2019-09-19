
/**
 * @file
 *
 *   The functions that interact with S3.
 */

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-diag');
const crypto                  = require('crypto');
const { awsService }          = require('../aws');

const { mkClientAndSessionIds } = require('../utils');

const mod                     = ra.modSquad(module, 'libS3');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();

module.exports._streamToS3_   = _streamToS3_;

DIAG.usage({aliases:{streamToS3:{}}});

DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump --AWS_PROFILE=bcs`);
DIAG.activeDevelopment(`--debug`);

mod.xport(DIAG.xport({streamToS3: function(argv, context, callback) {
  const diag    = DIAG.diagnostic({argv, context});

  var   {Body}                        = argv;
  var   {Bucket,Key,AWS_PROFILE}      = diag.args();

  AWS_PROFILE                         = AWS_PROFILE   || ENV.at('AWS_PROFILE');

  // Make the Key
  if (!Key) {
    let {clientId,sessionId}          = mkClientAndSessionIds(argv);
    Key                               = mkKey(Body, clientId, sessionId);
  }

  if (!(diag.haveArgs({Bucket,Key,Body}, {AWS_PROFILE})))                { return diag.exit(); }

  return _streamToS3_({Body, Bucket, Key, diag}, callback);
}}));

function _streamToS3_({Body, Bucket, Key, diag}, callback) {

  var upload = awsService('S3').upload({Bucket, Key, Body}, {partSize: 6 * 1024 * 1024});

  upload.on('httpUploadProgress', (progress) => {
    sg.debugLog(`uploading file`, {progress});
  });

  upload.send(function(err, data) {
    if (!sg.ok(err, data))  { sg.logError(err, `sending upload`, {Bucket, Key}); }

    // pushStatus({name:filename, data:{event: '/upload', filename, Bucket, Key, msg:`upload ${filename}`}}, function(){});

    return callback(err, data);
  });
}





function mkKey(Body, clientId, sessionId, dataType) {
  var key = [];

  key = sessionId.split('-');                   /* ['asdf1234','2020...0000'] */
  key.unshift(key[0].substr(0,3));              /* ['asd','asdf1234','2020...0000'] */
  key = [...key, dataType || 'telemetry'];      /* ['asd','asdf1234','2020...0000','telemetry'] */
  key = [...key, hashBody(Body)];               /* ['asd','asdf1234','2020...0000','telemetry','38ddf43a...'] */

  return key.join('/') + '.json';
}

function hashBody(Body) {
  var   shasum    = crypto.createHash('sha1');

  shasum.update(Body);

  return shasum.digest('hex');
}

