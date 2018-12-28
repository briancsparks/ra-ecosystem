

// -------------------------------------------------------------------------------------
//  requirements
//

const _                       = require('lodash');
var   lib                     = require('./v2/power');

lib.sg                        = _.extend({}, lib.power);

const sg                      = lib.power;

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
  return context.runAnywhereContext    = context.runAnywhereContext  || {};
};

const isSanityCheck = exports.isSanityCheck = function(context) {
  return context && context.sanityCheck === 'sanityCheck';
}

var   g_quiet = null;

exports.setQuiet = function(q) {
  g_quiet = q;
};

exports.getQuiet = function(context) {

  var   result = false;

  if (!context) {

    if (g_quiet != null) {
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
}

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

