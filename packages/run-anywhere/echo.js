
/**
 *
 */


// -------------------------------------------------------------------------------------
//  requirements
//

const sg                      = require('sgsg');
const _                       = sg._;

const argvGet                 = sg.argvGet;
const argvExtract             = sg.argvExtract;

// -------------------------------------------------------------------------------------
//  Data
//

var lib = {};

// -------------------------------------------------------------------------------------
//  Functions
//

lib.args = function(argv, context, callback) {
  const verbose = argvGet(argv, 'verbose,v');

  if (verbose) {
    console.error(sg.inspect({argv,context}));
  }

  const error   = argvExtract(argv, 'error,err');

  return callback(error, argv);
};


_.each(lib, (value, key) => {
  exports[key] = value;
});

// -------------------------------------------------------------------------------------
//  Helper functions
//

