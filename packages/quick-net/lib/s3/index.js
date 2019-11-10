
/**
 * @file
 *
 *   The functions that interact with S3.
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-diag');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-argv'));
const crypto                  = require('crypto');
const fs                      = require('fs');
const os                      = require('os');
const path                    = require('path');
const mime                    = require('mime');
const { awsService }          = require('../aws');
const s3                      = awsService('S3');
const _last                   = sg._.last;

const mod                     = ra.modSquad(module, 'quickNetS3');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();
// const ARGV                    = sg.ARGV();

const dg                      = DIAG.dg;
const {cleanContext}          = sg;


module.exports.streamThroughFileToS3  = streamThroughFileToS3;
module.exports.copyFileToS3           = copyFileToS3;
module.exports._copyFileToS3_         = _copyFileToS3_;
module.exports._streamToS3_           = _streamToS3_;
module.exports.parseS3Path            = parseS3Path;
module.exports.s3ExpiringTransferPath = s3ExpiringTransferPath;
module.exports.putMimeContentToS3     = putMimeContentToS3;
module.exports.putContentToS3         = putContentToS3;
module.exports.putShellScriptToS3     = putShellScriptToS3;
module.exports.putTarToS3             = putTarToS3;
module.exports.putJsonToS3            = putJsonToS3;
module.exports.putJsonLdToS3          = putJsonLdToS3;
module.exports.putJavascriptToS3      = putJavascriptToS3;


// =======================================================================================================
// streamToS3

DIAG.usage({aliases:{streamToS3:{
  Bucket :  'bucket'
}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump`);
DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump --debug`);
// DIAG.activeName = 'streamToS3';

mod.xport(DIAG.xport({streamToS3: function(argv, context, callback) {
  const diag    = DIAG.diagnostic({argv, context, callback});

  diag.tbd(`diagctx`, `streamToS3`, '', {argv, ...cleanContext(context)});

  var   {Body}            = argv;
  var   {Bucket,Key}      = getBucketAndKey(diag.args());

  if (!(diag.haveArgs({Bucket,Key,Body})))                                  { return diag.exit(); }

  return _streamToS3_(Body, {Bucket, Key}, callback);
}}));





// =======================================================================================================
// putToS3

DIAG.usage({aliases:{putToS3:{
  Body :  'body'
}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump`);
DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump --debug`);
// DIAG.activeName = 'putToS3';

mod.xport(DIAG.xport({putToS3: function(argv, context, callback) {
  const diag    = DIAG.diagnostic({argv, context, callback});

  var  {Bucket,Key}     = diag.args();
  var  Body             = getBody(argv, context)  || diag.args().Body;
  Bucket                = Bucket                  || ENV.at('QUICKNET_INGEST_BUCKET');

  if (!(diag.haveArgs({Bucket,Key,Body})))                                      { return diag.exit(); }

  // Call the real worker
  return _streamToS3_(stringify(Body), {Bucket, Key}, callback);
}}));


// =======================================================================================================
// putClientJsonToS3

DIAG.usage({aliases:{putClientJsonToS3:{
  Body :  'body'
}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump`);
DIAG.activeDevelopment(`--Bucket=quick-net-ingest-dump --debug`);
// DIAG.activeName = 'putClientJsonToS3';

mod.xport(DIAG.xport({putClientJsonToS3: function(argv, context, callback) {
  const diag    = DIAG.diagnostic({argv, context, callback});

  var  {Bucket,Key}     = diag.args();
  var  Body             = getBody(argv, context)  || diag.args().Body;
  Bucket                = Bucket                  || ENV.at('QUICKNET_INGEST_BUCKET');

  // If the caller did not provide an AWS Key, we will need the clientId/sessionId
  // to generate it.
  let clientId, sessionId;
  if (!Key) {
    ({clientId,sessionId}             = mkClientAndSessionIds(argv, Body));
  }

  // We need an AWS Key to store the blob. If we do not have one, try to compute it
  if (!Key) {
    if (!(diag.haveArgs({Body,clientId,sessionId}))) {
      return diag.exit();
    }

    Key = mkKey(Body, clientId, sessionId);
  }

  // Check that we have the params
  if (!(diag.haveArgs({Bucket,Key,Body}))) {
    // We have done all we can
    return diag.exit();
  }

  // Call the real worker
  return _putClientJsonToS3_(stringify(Body), {Bucket, Key}, callback);
}}));




// ----------------------------------------------------------------------------------------------------
function _putClientJsonToS3_(Body, {Bucket, Key}, callback) {
  return _streamToS3_(Body, {Bucket, Key}, callback);
  // var upload = s3.upload({Bucket, Key, Body}, {partSize: 6 * 1024 * 1024});

  // upload.on('httpUploadProgress', (progress) => {
  //   diag.i(`uploading file`, {progress, Key});
  // });

  // upload.send(function(err, data) {
  //   if (!sg.ok(err, data))  { diag.e(err, `sending upload`, {Bucket, Key}); }

  //   // pushStatus({name:filename, data:{event: '/upload', filename, Bucket, Key, msg:`upload ${filename}`}}, function(){});
  //   diag.i(`upload-send-done`, {Bucket, Key, err, data});

  //   return callback(err, data);
  // });
}


// ----------------------------------------------------------------------------------------------------
function putMimeContentToS3(Body, {ContentType, ...rest}, callback) {
  var {Bucket, Key} = findBucketKeyAndPath({...rest});
  return _streamToS3_(Body, {ContentType, Bucket, Key}, callback);
}


// ----------------------------------------------------------------------------------------------------
var uniq = 0;
function streamThroughFileToS3(readStream, argv, callback) {
  const pathname = path.join(os.tmpdir(), `stream-through-file-to-s3-${uniq++}`);

  const out = fs.createWriteStream(pathname);
  readStream.pipe(out);
  out.on('close', function() {
    return _copyFileToS3_(pathname, argv, callback);
  });
}

// ----------------------------------------------------------------------------------------------------
function copyFileToS3(pathname, s3filepath, callback) {
  const filename = _last(pathname.split(/[\\/]/));
  const {Bucket,Key} = parseS3Path(`${s3filepath}/${filename}`);

  if (!Bucket)    { dg.e(`NoBucket`, `sending uplaod`, {Bucket,Key,pathname,s3filepath}); return callback(`NoBucket`); }
  if (!Key)       { dg.e(`NoKey`,    `sending uplaod`, {Bucket,Key,pathname,s3filepath}); return callback(`NoKey`); }

  return _copyFileToS3_(pathname, {Bucket, Key}, function(err, data) {
    return callback(err, data);
  });
}

// ----------------------------------------------------------------------------------------------------
function _copyFileToS3_(pathname, argv, callback) {
  const Body = fs.createReadStream(pathname);

  return _streamToS3_(Body, argv, callback);
}

// ----------------------------------------------------------------------------------------------------
function _streamToS3_(Body, {Bucket, Key, ContentType ='application/json'}, callback) {

  if (!Bucket)                              { dg.e(`NoBucket`, `sending uplaod`, {Bucket,Key});   return callback(`NoBucket`); }
  if (!Key)                                 { dg.e(`NoKey`,    `sending uplaod`, {Bucket,Key});   return callback(`NoKey`); }
  if (!Body)                                { dg.e(`NoBody`,   `sending uplaod`, {Bucket,Key});   return callback(`NoBody`); }

  var upload = s3.upload({Bucket, Key, Body, ContentType}, {partSize: 6 * 1024 * 1024});

  upload.on('httpUploadProgress', (progress) => {
    dg.v(`uploading file s3://${Bucket}${Key}`, {progress});
  });

  upload.send(function(err, data) {
    if (!sg.ok(err, data))                  { dg.e(err, `sending upload`, {Bucket, Key}); }

    dg.v(`upload-send-done`, {Bucket, Key, err, data});

    return callback(err, data);
  });
}


// ----------------------------------------------------------------------------------------------------
function putContentToS3(Body, params, callback) {
  var {Bucket,Key,s3filepath}   = findBucketKeyAndPath(params);
  var ContentType               = mime.getType(s3filepath);
  return putMimeContentToS3(Body, {...params, ContentType}, callback);
}

// ----------------------------------------------------------------------------------------------------
function putShellScriptToS3(Body, params, callback) {
  return putMimeContentToS3(Body, {...params, ContentType: 'application/x-sh'}, callback);
}

// ----------------------------------------------------------------------------------------------------
function putTarToS3(Body, params, callback) {
  return putMimeContentToS3(Body, {...params, ContentType: 'application/x-tar'}, callback);
}

// ----------------------------------------------------------------------------------------------------
function putJsonToS3(Body, params, callback) {
  return putMimeContentToS3(Body, {...params, ContentType: 'application/json'}, callback);
}

// ----------------------------------------------------------------------------------------------------
function putJsonLdToS3(Body, params, callback) {
  return putMimeContentToS3(Body, {...params, ContentType: 'application/ld+json'}, callback);
}

// ----------------------------------------------------------------------------------------------------
function putJavascriptToS3(Body, params, callback) {
  return putMimeContentToS3(Body, {...params, ContentType: 'text/javascript'}, callback);
}

// ----------------------------------------------------------------------------------------------------
function parseS3Path(s3filepath) {
  const m = s3filepath.match(/s3:[/][/]([^/]+)[/](.*)/);
  if (!m) { return; }

  const Bucket = m[1];
  const Key = m[2];

  return {Bucket,Key};
}

// ----------------------------------------------------------------------------------------------------
// findBucketKeyAndPath is better
function getBucketAndKey(argv) {
  dg.tbd(`diagctx`, `getBucketAndKey`, '', {argv});

  var   s3filepath          = argv.s3path || argv.s3filepath || argv.path || argv.s3 || argv.filename || argv.name;
  var   {Bucket,Key}        = parseS3Path(s3filepath);

  Bucket  = argv.Bucket     || Bucket;
  Key     = argv.Key        || Key;

  dg.tbd(`diagctx`, `getBucketAndKey2`, '', {argv, Bucket,Key});
  return {Bucket,Key};
}


// ----------------------------------------------------------------------------------------------------
function findBucketKeyAndPath(argv) {
  dg.tbd(`diagctx`, `getBucketAndKey`, '', {argv});

  // Try to get from Bucket and Key params
  var {Bucket,Key} = argv;
  if (!Bucket || !Key) {
    ({Bucket,Key}       = parseS3Path(argv.s3path || argv.s3filepath || argv.path || argv.s3 || argv.filename || argv.name));
  }

  dg.tbd(`diagctx`, `getBucketAndKey2`, '', {argv, Bucket,Key});
  return {Bucket, Key, s3filepath: `s3://${Bucket}${Key}`};
}


// ----------------------------------------------------------------------------------------------------
function s3ExpiringTransferPath(fname, secs) {
  const expiry = ''+ (new Date().getTime() + (secs * 1000));
  return `${expiry}/${fname}`;
}

// function s3ify(path) {
//   if (path.toLowerCase().startsWith('s3://'))     { return path; }

//   return `s3://${path}`;
// }

// ----------------------------------------------------------------------------------------------------
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


// TODO: use from quick-net-client
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

