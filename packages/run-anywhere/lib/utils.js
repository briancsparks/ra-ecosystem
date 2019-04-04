

// -------------------------------------------------------------------------------------
//  requirements
//

const _                       = require('lodash');
var   lib                     = require('./v2/power');

lib.sgsg                      = _.extend({}, lib.power);

const sg                      = require('sg-flow');
lib.sg                        = sg;

// -------------------------------------------------------------------------------------
//  Data
//

// -------------------------------------------------------------------------------------
//  Functions
//

exports.isDebug = function() {
  return process.env.NODE_ENV !== 'production';
};

exports.isAws = function() {
  return process.env.LAMBDA_RUNTIME_DIR && process.env.AWS_REGION;
};

exports.raContext = function(context = {}) {
  return context.runAnywhere    = context.runAnywhere  || {};
};

const isSanityCheck = exports.isSanityCheck = function(context) {
  return context && context.sanityCheck === 'sanityCheck';
};

exports.pad = function(s_, len, fill) {
  var s = ''+s_;
  while (s.length < len) {
    s = fill + s;
  }
  return s;
};

exports.smallItems = function(obj, key = 'items') {
  sg.warn_if(!obj, `${obj} detected in smallItems (${__filename})`);

  if (!obj || !obj[key] || !_.isArray(obj[key])) {
    return obj;
  }

  return {...obj, [key]: [obj[key][0], `--- Plus ${obj[key].length-1} more items ---`]};
};

exports.omitDebug = function(obj) {
  return _.omit(obj, 'debug', 'verbose', 'ddebug', 'vverbose', 'forceSilent', 'silent');
};

// -------------------- ARGV

var g_ARGV = null;

exports.setARGV = function(ARGV) {
  g_ARGV = ARGV;
};

exports.getARGV = function() {
  return g_ARGV || {};
};

exports.pod = function(ARGV) {
  if (_.isFunction(ARGV.pod)) {
    return ARGV.pod();
  }
  return ARGV;
};


// -------------------- getQuiet

var   g_quiet   = null;
var   g_dquiet  = null;
var   g_verbose = false;

exports.setQuiet = function(q) {
  g_quiet = q;
};

exports.setDQuiet = function(q) {
  g_dquiet = q;
};

exports.setVerbose = function(v) {
  g_verbose = v;
};

exports.getVerbose = function(context={}, options={}) {

  // Quiet during sanity checks
  if (isSanityCheck(context)) {
    return false;
  }

  // Quiet during scripts
  if ('npm_lifecycle_event' in process.env) {
    return false;
  }

  // Quiet while claudia is testing
  if (process.platform === 'win32' && process.argv[1] && process.argv[1].match(/claudia/i)) {
    return false;
  }

  if (options.verbose) {
    return true;
  }

  // Otherwise, only if turned on
  return g_verbose;
};

exports.getQuiet = function(context) {

  var   result = false;

  if (!context) {

    if (g_quiet !== null) {
      return g_quiet;
    }

  } else {

    // Quiet during sanity checks
    if ((result = isSanityCheck(context))) {
      return result;
    }

    // Quiet during `ra invoke ...`
    if ((result = context.isRaInvoked)) {
      return result;
    }
  }

  // Quiet during scripts
  if ('npm_lifecycle_event' in process.env) {
    return true;
  }

  // Quiet while claudia is testing
  if (process.platform === 'win32' && process.argv[1] && process.argv[1].match(/claudia/i)) {
    return true;
  }

  return false;
};

exports.getDQuiet = function(context) {

  // TODO: putttt back
  // return false;

  if (g_dquiet !== null) {
    return g_dquiet;
  }

  if (sg.numKeys(context) && context.runAnywhere) {
    if ('dquiet' in context.runAnywhere) {
      return context.runAnywhere.dquiet;
    }
  }

  if (exports.getQuiet(context)) {
    return true;
  }

  return true;
};




// -----------
const pad = exports.pad = function(s_, len, fill) {
  var s = ''+s_;
  while (s.length < len) {
    s = fill + s;
  }
  return s;
};

// lib   = sg.extend(lib, require(...));

// The interesting keys on the process object
const procKeys = 'title,version,moduleLoadList,versions,arch,platform,release,argv,execArgv,env,pid,features,ppid,execPath,debugPort,config,argv0'.split(',');

const cleanProcess = function() {
  const x     = process;
  var result  = _.reduce(procKeys, (m,k) => {
    const v=x[k];
    if (!_.isFunction(v)) {
      return { ...m, [k]: v};
    }
    return m;
  }, {});

  return { ...result, env: lib.cleanEnv()};
};

lib.logProcess = function(msg) {
  console.log(msg, lib.inspect(cleanProcess()));
};




_.extend(module.exports, lib);

// -------------------------------------------------------------------------------------
//  Helper functions
//

