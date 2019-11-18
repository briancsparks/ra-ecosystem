
/**
 * @file
 *
 */
const sg                      = require('sg-argv');
const _                       = sg._;

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
  return callback(null, {argv, context});
}

