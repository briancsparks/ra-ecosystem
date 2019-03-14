
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

exports.mkFns = function(service, fnNames, options1, abort) {
  return sg.reduce(fnNames.split(','), {}, (m, fnName) => {
    return sg.kv(m, fnName, exports.mkInterceptorFn(service, fnName, options1, abort));
  });
};

exports.mkInterceptorFn = function(service, fnName, options1, abort) {
  const origFn = (service[fnName] ? (service[fnName].bind(service)) : noopFn);

  const interceptFn = function(...args_) {
    var   args          = _.toArray(args_);
    const continuation  = args.pop();
    const options_      = args.pop();
    var   options       = sg.merge({...options1, ...options_});

    const callback = function(err, data, ...rest) {
      var   ok = false;
      if (arguments.length === 0)     { ok = true; }

      if (!options.emptyOk) {
        if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }
      } else {
        if (arguments.length > 1)       { ok = sg.ok(err); }
      }

      // Report normal (ok === true) and errors that are aborted (!ok && options.abort)
      if (options.debug && (ok || (!ok && options.abort))) {
        sg.elog(`${fnName}(45)`, {args, ok, err, data, rest: rest});
      }

      if (!ok) {
        // Abort if not OK (and caller wants it.)
        if (options.abort) { return abort(err); }

        // Report, but leave out the verbose error
        if (options.debug) {
          sg.elog(`${fnName}(17)`, {args, err:(options.verbose ? err : true), data, rest: rest});
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





exports.mkFns2 = function(service, fnNames, ...rest) {
  return sg.reduce(fnNames.split(','), {}, (m, fnName) => {
    return sg.kv(m, fnName, exports.mkInterceptorFn2(service, fnName, ...rest));
  });
};

exports.mkInterceptorFn2 = function(service, fnName, ...rest) {
  var [ options1, abort ] = (rest.length === 2 ? rest : [{}, rest[0]]);

  const origFn = (service[fnName] ? (service[fnName].bind(service)) : noopFn);

  const interceptFn = function(...args_) {
    var   args          = _.toArray(args_);
    const continuation  = args.pop();
    const options_      = (args.length > 1 ? args.pop() : {});
    var   options       = sg.merge({...options1, ...options_});

    const callback = function(err, data, ...rest) {
      var   ok = isOk(options, err, data, ...rest);

      reportTheData(reportingOptions(ok, options));

      // Are we OK?
      if (!ok && options.abort && abort) {
        return abort(err);
      }

      // Success (or caller will handle error)
      return continuation(err, data, ...rest);


      // ==========================================================
      function reportTheData({condition, id, small}) {
        if (condition) { sg.elog(`${fnName}(${id})`, sg.merge({args: args_, ok, data, rest: rest}, {err: (small? !!err : err)})); }
      }
    };

    // Should we verbose?
    if (options.verbose) {
      sg.elog(`${fnName}(32)`, {args: args_});
    }

    // Call the original function
    if (args.length === 1 && _.isArray(args[0])) {
      args = args[0];
    }

    if (abort && abort.calling)   { abort.calling(`${fnName}`, {args}); }
    return origFn(...args, callback);
  };

  // Return the interceptor fn
  return interceptFn;
};

// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//

function reportingOptions(ok, options) {
  var   {condition,id,small} = {};

  // Are we OK?
  if (ok) {
    return returnIt(33, options.debug);

  } else {
    if (options.abort) {
      return returnIt(31, options.debug);
    }
  }

  // error, but caller doesnt want to abort
  return returnIt(35, options.debug, !options.verbose);

  function returnIt(id, condition, small) {
    return {id,condition,small};
  }
}

/**
 * Strategies for dealing with errors.
 *
 * Various libraries have different strategies for how they indicate an error. For example,
 * MongoDB will fill the data parameter with a 'receipt-ish' object when you are not asking
 * for data to be returned. However, if no data exists at a key, redis will return such that
 * the data item is `undefined`.
 *
 * @param {*} opts      - Control the strategy.
 * @param {*} err       - The err data object
 * @param {*} data      - The assumed data.
 * @param {*} rest      - The rest.
 *
 * @returns {boolean}   - Returns truthy if !err && no-other-errors
 */
function isOk(opts, err, data, ...rest) {

  var   options   = opts || {};
  var   ok        = false;

  if (options.check === 0) {
    ok = isOk_0(err, data, ...rest);
  } else if (options.check === 2) {
    ok = isOk_1(err, data, ...rest);
  } else {
    /* otherwise, must be level 2 */
    ok = isOk_2(err, data, ...rest);
  }

  return ok;

  // --------------------------------------------------
  // No checking
  function isOk_0(err, data, ...rest) {
    return true;
  }

  // This is just strategy 2 with emptyOK
  function isOk_1(err, data, ...rest) {
    options.emptyOk = true;
    return isOk_2(err, data, ...rest);
  }

  // The original - err is falsy, and any other params that are provided are not sg.isnt()
  // But you can also say that empty data items is OK, as long as err is falsy
  function isOk_2(err, data, ...rest) {
    var   ok = false;
    if (arguments.length === 0)       { ok = true; }

    if (!options.emptyOk) {
      if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }
    } else {
      if (arguments.length > 1)       { ok = sg.ok(err); }
    }

    return ok;
  }

}

function noopFn(...args_) {
  var   args          = _.toArray(args_);
  const callback      = args_.pop();

  return callback(new Error('ENOFN'));
}


