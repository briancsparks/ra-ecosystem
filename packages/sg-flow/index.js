
/**
 * @file
 */

var _                         = require('lodash');



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
  if (err)  { console.error(err); return false; }

  var result = true;
  _.each(_.rest(arguments), function(value, index) {
    var is = !isnt(value);

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
sg.okQuiet = sg.okq = function(err /*, [argN]*/) {
  if (err)  { return false; }

  var result = true;
  _.each(_.rest(arguments), function(value, index) {
    var is = !isnt(value);
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



