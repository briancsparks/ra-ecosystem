
/**
 * @file
 */

var _                         = require('lodash');
var sg                        = require('sg0');

/**
 *  Was the callback called to mean a good result? (Are the results OK?)
 *
 *  When you get a callback: `function(err, result1, result2) {...}` you can call
 *
 *  @example
 *          if (ok(err, result1, result2)) {
 *            // result1 and 2 are valid
 *          }
 *
 *  or:
 *
 *  @example
 *          if (!ok(err, result1, result2)) { return err; }
 *
 * @param {Object} err      - A typical err object
 * @param {Object[]} arg1 - The first data object returned
 *
 * @returns {Boolean}     Err / arg0 are OK.
 */
sg.okv = function(err /*, [argN]*/) { /* verbose */
  if (err)  { console.error(err); return false; }

  var result = true;
  _.each(_.drop(arguments), function(value, index) {
    var is = !sg.isnt(value);

    result = result && is;
    if (!is) {
      console.error("Param "+index+" is "+value);
    }
  });

  return result;
};

/**
 *  Was the callback called to mean a good result? (Are the results OK?)
 *
 *  When you get a callback: `function(err, result1, result2) {...}` you can call
 *
 *          if (ok(err, result1, result2)) {
 *            // result1 and 2 are valid
 *          }
 *
 *  or:
 *
 *          if (!ok(err, result1, result2)) { return err; }
 */
sg.ok = function(err /*, [argN]*/) {
  if (err)  { return false; }

  var result = true;
  _.each(_.drop(arguments), function(value, index) {
    var is = !sg.isnt(value);
    result = result && is;
  });

  return result;
};

/**
 * The SG-specific error type.
 *
 * Understands that `ENO` is a common prefix for standard errors, like `ENOENT`.
 *
 * @param {*} message
 */
function SgError(message) {
  this.name  = 'SgError';
  this.stack = (new Error()).stack;

  if (_.isString(message) && message.startsWith('ENO')) {
    this.name     = _.first(message.split(/[^a-z0-9]/i));
    this.message  = message || 'Default Message';
  } else {
    this.message  = message || 'Default Message';
  }
}
SgError.prototype = Object.create(Error.prototype);
SgError.prototype.constructor = SgError;

/**
 * Ensures that `e` is an Error type.
 *
 * Will create an SgError from a string, so you can pass in 'ENOENT. Not found', for example
 *
 * @param {*} e
 * @returns
 */
var toError = function(e) {
  if (e instanceof Error)     { return e; }
  if (_.isString(e))          { return new SgError(e); }
  if (_.isArray(e))           { return new Error(JSON.stringify(e)); }

  if (_.isObject(e)) {
    if (_.isString(e.error))  { return new SgError(e.error); }
    if (_.isString(e.Error))  { return new SgError(e.Error); }
    if (_.isString(e.err))    { return new SgError(e.err); }
    if (_.isString(e.Err))    { return new SgError(e.Err); }
  }

  if (e === null)             { return e; }
  if (e === undefined)        { return e; }

  return new Error('' + e);
};

/**
 * Sends the message to stderr, and retrurns an Error-derived object.
 *
 * @param {*} e
 * @param {*} message
 * @returns
 */
var reportError = function(e, message) {
  if (!e) { return; }

  var result = toError(e);
  var msg    = '';

  if (_.isString(e)) {
    msg += e+' at ';
  }

  if (message) {
    msg += message+': ';
  }

  if (msg) {
    process.stderr.write(msg);
  }

  console.error(result);

  return result;
};

/**
 *  Logs the message and goes to the `next()` function.
 *
 *  When you have a next function, like in an sg.__run(...), you could get an
 *  err response at any time.  If you want to log the error, and skip the rest
 *  of the step, but want to continue on with the next step, use this.
 *
 *  Virtually identical to `return next()` except you can log the msg/err to stderr
 *
 *  Usage:
 *        if (err) { return skip(err, next); }
 *
 */
sg.skip = function(msg_, next) {
  var msg = msg_;
  if (!_.isString(msg)) { msg = sg.inspect(msg_); }

  console.error(msg);
  return next();
};

/**
 * The internal workhorse for all the flows that run sequentailly.
 *
 * @param {*} coll
 * @param {*} fn
 * @param {*} callback
 * @returns
 */
var __each_ = function(coll, fn, callback) {

  if (_.isArray(coll) && coll.length <= 0) {
    return callback();
  }

  var i = 0, end;
  var indexes, values, errors, hasError = false;

  if (_.isArray(coll)) {
    indexes = _.range(coll.length);
    values = [];
    errors = [];
  }
  else {
    indexes = _.keys(coll);
    values = {};
    errors = {};
  }

  if ((end = indexes.length) === 0) {
    return callback(hasError ? errors : null, values);
  }

  var doOne = function() {
    var item = coll[indexes[i]];
    var nextI = i + 1;
    var next = function(err, val) {
      if (err) { hasError = true; }

      errors[indexes[i]] = err;
      values[indexes[i]] = val;

      i = nextI;
      if (i < end) {
        return process.nextTick(function() {
          doOne();
        });
      }

      return callback(hasError ? errors : null, values);
    };

    return fn(item, next, indexes[i], coll);
  };

  return setImmediate(doOne);
};

/**
 * Iterate over each item in a collection and call a 'callbackified' function on each one.
 *
 * The `callback` parameter can be first or last, and is determined by type.
 *
 * * Passing it last conforms to the Node.JS calling convention.
 * * Passing it first is very convienent, if you have a named function, like
 *   `next` or `callback`.
 *
 * @param {*} coll
 * @param {*} fn
 * @param {*} callback
 * @returns
 */
sg.__each = function(a, b, c) {
  // If the caller has a named function, like 'next', it is easier to call this
  // function with that name first
  if (_.isFunction(a)) { return __each_(b, c, a); }

  // Normal
  return __each_(a, b, c);
};

/**
 * Run each function sequentially.
 *
 * The arguments can be in either order, and are determined by type.
 *
 * @param {*} fns
 * @param {*} onDone
 * @returns
 */
sg.__run = function(a, b) {
  var fns, callback;

  if (_.isArray(a)) {
    fns = a; callback = b;
  } else {
    fns = b; callback = a;
  }

  return sg.__each(
    fns,
    function(fn, next, index, coll) {
      return fn(next, index, coll);
    },
    callback || function() {}
  );
};

/**
 *  Runs a list of Node.js-style functions synchronously.
 *
 *  This is a version of __run() that has a couple of extra features for typical handlers.
 *
 *  * Passes a `self` parameter that can be used to share data/state between the functions.
 *    Works great to accumulate the function's result.
 *  * Provides the finalization function to each function, so it can be called at any point.
 *  * Provides two finalization functions, intending one for normal/success results, and one
 *    for errors.
 *  * Very flexible parameter signature. Detects each param by its type. The only constraints
 *    are that `self` must be first, if provided; and that `abort` comes after `last`.
 *
 *  This function was built for two specific use-cases that occur a lot. It allows to provide
 *  a `main` function first in the list, to improve readability; and allows `callback` to be
 *  passed in (usually before the functions), and then calling `last` or `abort` in any function
 *  is really calling `callback`.
 *
 *  If the last function in the Array calls `next()` (which is very typical), then last will
 *  be called as `last(null, self)`. This is obviously to facilitate using `callback` as `last`.
 *  If you do not want `self` to be passed automatically like this, pass your object in double-
 *  wrapped in Arrays: `[[{}]]`. The wrapping Arrays are just decoration, and will be removed
 *  before anything is done with `self`.
 *
 *  @param {Object} self    - An object passed to each function. Makes it easy for the functions
 *                            to share state/data. Must be the first parameter. If it is not supplied
 *                            __run2() will provide `{}`, and pass as the _last_ parameter to each
 *                            of the functions. If provided, it is passed as the first parameter.
 *  @param {function[]} fns - An Array of functions to be run on after the other.
 *  @param {function} last  - The last function to be run. This is a separate function outside the
 *                            Array of functions. It may be provided in any location in the parameter
 *                            list.
 *  @param {function} abort - A separate function to be used as a final function. If not provided, will
 *                            be a copy of `last`. To skip providing a function, but to have `abort` not
 *                            be a copy of `last`, pass `false`. `abort` will always put a truthy
 *                            value in the first parameter (using `'aborted'` as a default.) This
 *                            allows you to just `return abort();` in any function.
 */
sg.__run2 = function(a,b,c,d) {   // self, fns, last, abort
  // Figure out params
  var args = _.toArray(arguments);
  var self,fns,last,abort_,abort,privateSelf,noSelf;

  // self can only be the first param, if not, use a blank Object
  self          = sg.isObject(args[0]) && args.shift();
  privateSelf   = !self;                                  // If self is undefined here, it is potentially a private-self

  self          = self || _.isArray(args[0]) && args[0].length === 1 && _.isArray(args[0][0]) && args[0][0].length === 1 && args[0][0][0];
  privateSelf   = privateSelf && !!self;                  // But if self wasn't set by [[...]], it is not private-self

  noSelf        = !self;
  self          = self || {};

  // Fns is the only Array
  args = _.filter(args, function(arg) { return fns || !(fns = _.isArray(arg) && arg); });

  // last is the first function
  args = _.filter(args, function(arg) { return last || !(last = _.isFunction(arg) && arg); });

  // any remaining arg has to be abort
  abort_ = args.shift();

  // Any of them can be unset
  fns   = fns   || [];
  last  = last  || function(){};

  if (abort_ === false)  { abort_ = function(){}; }
  else                   { abort_ = abort_ || last; }

  abort = function(err) {
    var args = _.drop(arguments);
    args.unshift(err || 'aborted');

    // Make sure it is a function, then call it
    if (_.isFunction(abort_)) {
      return abort_.apply(this, args);
    }
  };

  return sg.__each(
    fns,
    function(fn, next, index, coll) {
      if (noSelf) {
        return fn(next, last, abort, self);
      }
      return fn(self, next, last, abort);
    },
    function(a,b) {
      if (privateSelf) {
        return last.apply(this, arguments);
      }

      return last(null, self);
    }
  );
};

/**
 *  Replaces all attributes on result with those on all the rest of the arguments.
 *
 *  When using __run2, the result of the operation is passed into each step, so you can
 *  add attributes to the result. However, using this style you cannot set the whole
 *  result object at once. (You cannot do `result = {ack:'bar'}`) You would have to remove
 *  all existing attributes, and add all new ones -- thats what this function does.
 *
 */
sg.replaceResult = function(result /*, ...replaces*/) {

  var replaces = _.drop(arguments);

  // First, clobber the result
  _.each(result, function(value, key) {
    delete result[key];
  });

  // Then, loop over all the other fn params, and add those to result
  _.each(replaces, function(replace) {
    _.each(replace, function(value, key) {
      result[key] = value;
    });
  });
};


/**
 *  Calls fn until it wants to quit
 */
sg.until = function(/* [options,] fn, callback */) {
  var args      = _.toArray(arguments);
  var callback  = args.pop();
  var fn        = args.pop();
  var options   = args.shift() || {};

  var max       = options.max;
  var timeout   = options.timeout;

  options.interval  = options.interval || options.delay;

  var count = -1, start = _.now();

  var again;
  var once = function() {
    count += 1;

    // Limit the number of executions
    if (options.max) {
      if (count >= max)                 { return callback(toError("Too many executions in until(): "+count)); }
    }

    // Limit the time it can run
    if (options.timeout) {
      if (timeout > (_.now() - start))  { return callback(toError("Timeout in until: ("+(_.now() - start)+" ms.)")); }
    }

    return fn(again, callback, count, _.now() - start);
  };

  again = function() {
    var delay = options.interval;

    if (arguments.length > 0) {
      delay = arguments[0];
    }

    if (delay) {
      return setTimeout(once, delay);
    }

    /* otherwise */
    return once();
  };

  // Yes, this actually works
  again.uncount = function(num_) {
    count -= (num_ || 1);
  };

  // Yes, this actually works
  again.uncountSometimes = function(num_) {
    if (Math.random() > 0.25) {
      return again.uncount.apply(this, arguments);
    }
  };

  return once();
};






/**
 * Send each item in the collection to the fn, in parallel.
 *
 * @param {*} coll
 * @param {*} max
 * @param {*} fn
 * @param {*} onDone
 * @returns
 */
var __eachll = sg.__eachll = function(list_ /*, max_, fn_, callback_*/ ) {

  var args      = _.drop(arguments);
  var callback  = args.pop();
  var fn        = args.pop();
  var max       = args.length > 0 ? args.shift() : 10000000;

  if (_.isArray(list_)) {
    var list = list_.slice();

    if (list.length === 0) { return callback(); }

    var outstanding = 0;
    var launch = function(incr) {
      outstanding += (incr || 0);

      if (list.length > 0 && outstanding < max) {
        outstanding++;
        fn(list.shift(), function() {
          process.nextTick(function() {
            launch(-1);
          });
        }, list_.length - list.length - 1, list_);
        //process.nextTick(launch);
        launch();
      }
      else if (list.length === 0 && outstanding === 0) {
        callback();
      }
    };
    launch(1);
    outstanding -= 1;
    return;
  }

  /* otherwise */
  return sg.__eachll(_.keys(list_), max, function(key, nextKey) {
    fn(list_[key], nextKey, key, list_);
  }, callback);
};

/**
 * Run the `fns` in parallel, running `max` at one time.
 *
 * @param {*} fns
 * @param {*} max
 * @param {*} onDone
 * @returns
 */
sg.__runll = function(/*fns, max, onDone*/) {

  var args    = _.drop(arguments, 0);
  var onDone  = args.pop();

  // The dispatch function
  args.push(function(fn /*, next, index, coll*/) {
    // fn(next, index, coll)
    return fn.apply(this, _.drop(arguments));
  });

  // The final function
  args.push(onDone);

  return __eachll.apply(this, args);
};

/**
 *  Internally wrap a function so error handling is not so boiler-plateish.
 */
sg.iwrap = function(myname, fncallback /*, abort, body_callback*/) {
  var   args             = _.drop(arguments, 2);
  const body_callback    = args.pop();
  var   abort            = args.shift();

  abort = abort || function(err, msg) {
    if (msg)  {
      console.error(msg);
    }
    return fncallback(err);
  };

  var abortCalling;
  var abortParams;

  var eabort = function(err, abortCalling2, msg_ = '') {
    // return function(err) {
    //   if (!err) { return callback.apply(this, arguments); }

      if (_.isString(err)) {
        err = {msg:err};
      }

      // if ('code' in err && !('errno' in err))     { err.errno = err.code; }
      // if ('errno' in err && !('code' in err))     { err.code  = err.errno; }

      const abortCalling_ = abortCalling || abortCalling2;     abortCalling  = null;
      const abortParams_  = abortParams;                       abortParams   = null;

      var msg = `Aborting ${msg_} `;

      if (abortCalling_) {
        msg += myname + '-->' + abortCalling_;
      }

      if (abortParams_) {
        msg += ': ' + abortParams_;
      }

      return abort(err, msg);
    // };
  };

  eabort.p = function(params_) {
    const params = _.isObject(params_) ? params_ : { param: params_};
    abortParams = JSON.stringify(params);
    return params_;
  };

  eabort.calling = function(calledName, params) {
    abortCalling  = null;
    abortParams   = null;

    if (calledName) {
      abortCalling = calledName;
    }

    if (params) {
      return eabort.p(params);
    }

    return params;
  };

  return body_callback(eabort, eabort.calling);
};

var example = function(a, b, callback) {
  const s3put = function(){};

  return sg.iwrap('example', callback, function(abort) {

    return sg.__run2({}, callback, [function(result, next, last) {
      var   params = {x:42};

      // If we end up calling `abort`, this info is available
      abort.calling('s3put');
      abort.p(params);

      // Call a standard Node.JS style fn
      return s3put(params, function(err, data) {
        if (!sg.ok(err, data)) { return abort(err); }

        result.x = data.y;

        // Can exit early
        if (data.completeSuccess) {
          return last(null, data);
        }

        return next();
      });
    }, function(result, next) {
      result.ok = true;

      // Calling `next()` will send `result` to `callback(null, result)`
      return next();
    }]);
  });
};

// Export functions
_.each(sg, function(fn, name) {
  exports[name] = sg[name];
});
