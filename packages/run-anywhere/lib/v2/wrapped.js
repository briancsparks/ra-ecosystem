
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg-flow');
const { _ }                   = sg;


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.mkFns = function(service, fnames, options1, abort) {
  return sg.reduce(fnames.split(','), {}, (m, fname) => {
    return sg.kv(m, fname, exports.mkInterceptorFn(service, fname, options1, abort));
  });
};

exports.mkInterceptorFn = function(service, fname, options1, abort) {
  const origFn = (service[fname] ? (service[fname].bind(service)) : noopFn);

  const interceptFn = function(...args_) {
    var   args          = _.toArray(args_);
    const continuation  = args.pop();
    const options_      = args.pop();
    var   options       = sg.merge({...options1, ...options_});

    const callback = function(err, data, ...rest) {
      var   ok = false;
      if (arguments.length === 0)     { ok = true; }
      if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }

      // Report normal (ok === true) and errors that are aborted (!ok && options.abort)
      if (options.debug && (ok || (!ok && options.abort))) {
        sg.elog(`${fname}(45)`, {args, err, data, rest: rest});
      }

      if (!ok) {
        // Abort if not OK (and caller wants it.)
        if (options.abort) { return abort(err); }

        // Report, but leave out the verbose error
        if (options.debug) {
          sg.elog(`${fname}(17)`, {args, err:(options.verbose ? err : true), data, rest: rest});
        }
      }

      // Success (or caller will handle error)
      return continuation(err, data, ...rest);
    };

    // Call the original function
    return origFn(...args, callback);
  };

  // Return the interceptor fn
  return interceptFn;
};

// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//

function noopFn(...args_) {
  var   args          = _.toArray(args_);
  const callback      = args_.pop();

  return callback(new Error('ENOFN'));
}


