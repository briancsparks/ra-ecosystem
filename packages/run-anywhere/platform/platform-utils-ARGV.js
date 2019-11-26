
const sg                        = require('sg-argv');
const _                         = require('lodash');
const libUrl                    = require('url');
const {extractSysArgv}          = require('../lib/v3/invoke');
const platform                  = require('./platform-utils');
const {decodeBodyObj,
       noop,
       normalizeHeaders,
       methodHasBody}           = require('./platform-utils');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.argvify                  = argvify;
module.exports.contextify               = contextify;
module.exports.normalizeEvent           = normalizeEvent;
module.exports.normalizeEventForLogging = normalizeEventForLogging;
module.exports.decodeBody               = decodeBody;

// ------------------------------------------------------------------------------------------------------------------------------
function argvify(event, context_, callback =noop) {
  var context;
  const argv_           = event.argv;
  const user_sys_argv_  = event.user_sys_argv;

  var {
    // sys_argv:
    fnName,
    ignore, globIgnore,
    // fnTable, filelist, glob,

    user_sys_argv,
    argv,
    ...sys_argv
  }               = extractSysArgv({argv: sg.argvPod(event.argv)}, {user_sys_argv: user_sys_argv_});

  // sg.warn_if(sg.firstKey(others), `ENOTCLEAN`, {others});

  var commands    = argv_._;

  // ---
  fnName          = fnName || commands.shift();

  // ---
  ignore          = [__filename, ...sg.arrayify(globIgnore || ignore)];

  sys_argv        = sg.merge({ignore, ...sys_argv, ...user_sys_argv});

  const method  = 'INVOKE';
  const query   = sg.argvPod(argv);
  const path    = '';
  const headers = normalizeHeaders({});
  const event_  = {...event, argv:sg.argvPod(event.argv)};

  // TODO: Figure out stage
  const stage   = '';

  [argv,context]      =  platform.argvify(query, /*body=*/{}, headers, /*extras=*/{}, path, method, stage, event_, context_, {sys_argv});
  callback(null, argv, context);
  return [argv, context];
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify(event, context, callback) {
  return platform.contextify_Xyz(event, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------------------
function normalizeEvent(event_, context) {

  var   event = {...event_};

  // Must have body for these
  const body = decodeBody(event_, context, useSmEvents);
  event = {...event, ...(body ||{})};

  return event;
}

// ------------------------------------------------------------------------------------------------------------------------------
function normalizeEventForLogging(event_, context) {

  var   event = {...event_};

  // Must have body for these
  const body = decodeBody(event_, context, true);
  event = {...event, ...(body ||{})};

  return event;
}

// ------------------------------------------------------------------------------------------------------------------------------
function decodeBody(event, context, smaller) {
  return decodeBodyObj(event.body, event, context, {smaller});
}

