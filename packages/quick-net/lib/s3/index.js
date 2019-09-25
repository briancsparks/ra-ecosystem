
/**
 * @file
 *
 *   The functions that interact with S3.
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-diag');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-argv'));
const crypto                  = require('crypto');
const { awsService }          = require('../aws');
const S3                      = awsService('S3');

const mod                     = ra.modSquad(module, 'quickNetS3');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();

const ARGV = sg.ARGV();

// DIAG.usage({aliases:{streamToS3:{}}});

// // TODO: activeDevelopment needs to be associated with thie fn
// DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump --AWS_PROFILE=bcs`);
// DIAG.activeDevelopment(`--debug`);

// mod.xport(DIAG.xport({streamToS3: function(argv, context, callback) {
//   const diag    = DIAG.diagnostic({argv, context, callback});

//   var   {Body}                        = argv;
//   var   {Bucket,Key,AWS_PROFILE}      = diag.args();

//   AWS_PROFILE                         = AWS_PROFILE   || ENV.at('AWS_PROFILE');

//   // Make the Key
//   if (!Key) {
//     let {clientId,sessionId}          = mkClientAndSessionIds(argv);
//     Key                               = mkKey(Body, clientId, sessionId);
//   }

//   if (!(diag.haveArgs({Bucket,Key,Body}, {AWS_PROFILE})))                { return diag.exit(); }

//   return _streamToS3_({Body, Bucket, Key, diag}, callback);
// }}));


// function _streamToS3_({Body, Bucket, Key, diag}, callback) {
//   var upload = S3.upload({Bucket, Key, Body}, {partSize: 6 * 1024 * 1024});

//   upload.on('httpUploadProgress', (progress) => {
//     diag.i(`uploading file`, {progress, Key});
//   });

//   upload.send(function(err, data) {
//     if (!sg.ok(err, data))  { diag.e(err, `sending upload`, {Bucket, Key}); }

//     // pushStatus({name:filename, data:{event: '/upload', filename, Bucket, Key, msg:`upload ${filename}`}}, function(){});

//     return callback(err, data);
//   });
// }






DIAG.usage({aliases:{putToS3:{}}});

DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump --AWS_PROFILE=bcs`);
DIAG.activeDevelopment(`--debug`);

mod.xport(DIAG.xport({putToS3: function(argv, context, callback) {
  const diag    = DIAG.diagnostic({argv, context, callback});

  var  {Bucket,Key,AWS_PROFILE}       = diag.args();
  var  Body                           = getBody(argv, context) || diag.args().Body;

  AWS_PROFILE                         = AWS_PROFILE   || ENV.at('AWS_PROFILE');
  Bucket                              = Bucket        || ENV.at('IngestBucket');

  // If the caller did not provide an AWS Key, we will need the clientId/sessionId
  // to generate it.
  let clientId, sessionId;
  if (!Key) {
    ({clientId,sessionId}             = mkClientAndSessionIds(argv, Body));
  }

  // We need an AWS Key to store the blob. If we do not have one, try to compute it
  if (!Key) {
    // TODO: constructed should be defaultable
    if (!(diag.haveArgs({Body,clientId,sessionId}, {}))) {
      return diag.exit();
    }

    Key = mkKey(Body, clientId, sessionId);
  }

  // Check that we have the params
  // TODO: constructed should be defaultable
  if (!(diag.haveArgs({Bucket,Key,Body}, {}))) {
    // We have done all we can
    return diag.exit();
  }

  // Call the real worker
  return _putToS3_({Body: stringify(Body), Bucket, Key, diag}, callback);
}}));


function _putToS3_({Body, Bucket, Key, diag}, callback) {
  var upload = S3.upload({Bucket, Key, Body}, {partSize: 6 * 1024 * 1024});

  upload.on('httpUploadProgress', (progress) => {
    diag.i(`uploading file`, {progress, Key});
  });

  upload.send(function(err, data) {
    if (!sg.ok(err, data))  { diag.e(err, `sending upload`, {Bucket, Key}); }

    // pushStatus({name:filename, data:{event: '/upload', filename, Bucket, Key, msg:`upload ${filename}`}}, function(){});
    diag.i(`upload-send-done`, {Bucket, Key, err, data});

    return callback(err, data);
  });
}







function getBody(argv, context) {
  if (argv.__meta__ && argv.__meta__.body) {
    return argv.__meta__.body;
  }
  return;
}

function stringify(x) {
  if (typeof x === 'string')  { return x; }

  return JSON.stringify(x);
}

function mkKey(Body, clientId, sessionId, dataType) {
  var key = [];

  key = sessionId.split('-');                   /* ['asdf1234','2020...0000'] */
  key.unshift(key[0].substr(0,3));              /* ['asd','asdf1234','2020...0000'] */
  key = [...key, dataType || 'telemetry'];      /* ['asd','asdf1234','2020...0000','telemetry'] */
  key = [...key, hashBody(Body)];               /* ['asd','asdf1234','2020...0000','telemetry','38ddf43a...'] */

  return key.join('/') + '.json';
}

function hashBody(Body_) {
  var   shasum    = crypto.createHash('sha1');

  var Body = Body_;
  if (!(typeof Body === 'string')) {
    Body = JSON.stringify(Body);
  }

  shasum.update(Body);

  return shasum.digest('hex');
}



function mkClientAndSessionIds(argv, Body) {
  var   sessionId = argv.sessionId  || Body.sessionId;
  var   clientId  = argv.clientId   || Body.clientId;

  if (!clientId) {
    if (!sessionId) {
      // Make both
      sessionId = `${mkClientId()}-Xx-${mkSessionTime()}`;
      return mkClientAndSessionIds({sessionId});
    }

    // sessionId, but not clientId
    clientId = (sessionId.split('-')[0]) || mkClientId();
    return {clientId, sessionId};
  }

  // We have clientId, do we have sessionId?
  if (!sessionId) {
    sessionId = `${clientId}-${mkSessionTime()}`;
  }

  return {clientId, sessionId};
}

const letters     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const lettersLen  = letters.length;
const alphabet    = letters + '0123456789';
const alphaLen    = alphabet.length;

function randItem(max) {
  return alphabet[Math.floor(Math.random() * Math.floor(max))];
}

const clientIdLen = 64;
function mkClientId() {
  var id = randItem(lettersLen);
  for (let i = 1; i < clientIdLen; ++i) {
    id += randItem(alphaLen);
  }
}

function mkSessionTime() {
  const now = new Date();
  return '' +
    pad(4, now.getUTCFullYear()) +
    pad(2, now.getUTCMonth()+1) +
    pad(2, now.getUTCDate()) +
    pad(2, now.getUTCHours()) +
    pad(2, now.getUTCMinutes()) +
    pad(2, now.getUTCSeconds()) +
    pad(3, now.getUTCMilliseconds());
}

function pad(len, x_, ch_) {
  var x   = ''+x_;
  var ch  = ch_ || '0';

  while (x.length < len) {
    x = ch + x;
  }

  return x;
}

