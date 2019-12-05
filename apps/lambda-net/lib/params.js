
const sg                      = require('sg-env');
const ENV                     = sg.ENV();


// ----------------------------------------------------------------------------------------------------------------------------
module.exports.getBucketInfo = function(x, ...args) {

  var Bucket          = getBucket(x, ...args);
  var FailBucket      = getFailBucket(x, ...args);

  return {Bucket, FailBucket};
};

// ----------------------------------------------------------------------------------------------------------------------------
const getBucket =
module.exports.getBucket = function(x, configuration, name) {
  var v = configuration.value(['s3', 'bucket', name, 'Bucket']);
  if (v) {
    return v;
  }

  return _getBucket(x, `LAMBDANET_${name}_BUCKET`.toUpperCase(), `lambda-net-${name}`);
};

// ----------------------------------------------------------------------------------------------------------------------------
const getFailBucket =
module.exports.getFailBucket = function(x, configuration, name) {
  var v = configuration.value(['s3', 'bucket', name, 'FailBucket']);
  if (v) {
    return v;
  }

  return _getFailBucket(x, `LAMBDANET_FAIL_${name}_BUCKET`.toUpperCase(), `lambda-net-${name}-fail`);
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


