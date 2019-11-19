
/**
 * @file
 *
 */
const sg                      = require('sg-argv');
const _                       = sg._;
const putils                  = require('./platform/utils');

const assertArgvContext       = putils.assertArgvContext;

const argvGet                 = sg.argvGet;
const argvPod                 = sg.argvPod;

module.exports.echo = echo;
module.exports.args = args;

// -------------------------------------------------------------------------------------
//  Functions
//

function args (argv, context, callback) {
  const verbose = argvGet(argv, 'verbose,v');

  if (verbose) {
    console.error(sg.inspect({argv,context}));
  }

  const error   = argvGet(argv, 'error,err');

  return callback(error, argv);
}

function echo (argv, context_, callback) {
  const context = sg.safeJSONParse(sg.safeJSONStringify2(context_));

  assertArgvContext(`echo`, true, argv, true, context, __filename);

  return callback(null, {argv:smArgv(argv), context: smContext(context)});
  // return callback(null, {argv, context});
}

function smArgv(argv_) {
  var argv = {...argv_};

  if (argv && argv.__meta__ && argv.__meta__.event) {
    argv = {...argv,
      __meta__: {...argv.__meta__,
        event : smEvent(argv.__meta__.event)
      }
    };
  }

  return argv;
}

function smContext(context_) {
  var context = {...context_};

  if (context && context.event) {
    context = {...context,

      event         : smEvent(context.event),
      argv          : smArgv(context.argv),
      runAnywhere   : Object.keys(context.runAnywhere),
    };
  }

  return context;
}

function smEvent(event_) {
  var event = {...event_};

  if (event && event.req) {
    event = {...event,

      req : event.req.url,
      res : !!event.res,
    };
  }

  return event;
}
