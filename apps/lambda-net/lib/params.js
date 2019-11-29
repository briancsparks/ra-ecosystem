
const sg                      = require('sg-env');
const ENV                     = sg.ENV();


// ----------------------------------------------------------------------------------------------------------------------------
module.exports.getBucketInfo = function(x) {
  var Bucket          = getBucket(x);
  var FailBucket      = getFailBucket(x);

  return {Bucket, FailBucket};
};

// ----------------------------------------------------------------------------------------------------------------------------
const getBucket =
module.exports.getBucket = function(x) {
  return _getBucket(x, 'LAMBDANET_INGEST_BUCKET', 'lambda-net-ingest');
};

// ----------------------------------------------------------------------------------------------------------------------------
const getFailBucket =
module.exports.getFailBucket = function(x) {
  return _getFailBucket(x, 'LAMBDANET_FAIL_INGEST_BUCKET', 'lambda-net-ingest-fail');
};

// ----------------------------------------------------------------------------------------------------------------------------
module.exports.getRawBucketInfo = function(x) {
  var Bucket          = getRawBucket(x);
  var FailBucket      = getRawFailBucket(x);

  return {Bucket, FailBucket};
};

// ----------------------------------------------------------------------------------------------------------------------------
const getRawBucket =
module.exports.getRawBucket = function(x) {
  return _getBucket(x, 'LAMBDANET_RAW_INGEST_BUCKET', 'lambda-net-raw-ingest');
};

// ----------------------------------------------------------------------------------------------------------------------------
const getRawFailBucket =
module.exports.getRawFailBucket = function(x) {
  return _getFailBucket(x, 'LAMBDANET_RAW_FAIL_INGEST_BUCKET', 'lambda-net-raw-ingest-fail');
};

// ----------------------------------------------------------------------------------------------------------------------------
const _getBucket = function(x_, envname, def) {
  const x = decode(x_);
  return (x && (x.Bucket || x.$_just)) || ENV.at(envname) || def;
};

// ----------------------------------------------------------------------------------------------------------------------------
const _getFailBucket = function(x, envname, def) {
  return decode2(x, 'FailBucket') || ENV.at(envname) || def;
};



// ----------------------------------------------------------------------------------------------------------------------------
function decode(x, typestring ='string') {
  if (typeof x === typestring)  { return {$_just:x}; }
  if (sg.isObject(x))           { return x; }
}

// ----------------------------------------------------------------------------------------------------------------------------
function decode2(x, name, typestring ='string') {
  if (typeof x === typestring)  { return x; }
  if (sg.isObject(x))           { return x[name]; }
}


