
const sg                      = require('sg0');
const { _ }                   = sg;



/**
 * The SG-specific error type.
 *
 * Understands that `ENO` is a common prefix for standard errors, like `ENOENT`.
 *
 * @param {string} message -- The message to send.
 * @param {Object} err     -- An object describing the error.
 * @param {number} httpCode -- The HTTP response code.
 */
function SgError(message, err, httpCode) {
  this.name       = 'SgError';

  if (httpCode) {
    this.httpCode   = httpCode;
  }

  Error.stackTraceLimit = 25;
  Error.captureStackTrace(this, SgError);

  if (err) {
    this.error = err;
  }

  if (_.isString(message) && message.match(/^[A-Z][A-Z][A-Z]/)) {
    this.code     = _.first(message.split(/[^a-z0-9]/i));
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
 * @param {*} e -- The error code like ENOENT.
 * @param {*} e2 -- The error object.
 * @param {number} httpCode -- The HTTP response code.
 * @returns {*} An Error-derived object.
 */
var toError = function(e, e2, httpCode) {
  if (e instanceof Error)         { return e; }
  if (_.isString(e))              { return new SgError(e, e2, httpCode); }
  if (_.isArray(e))               { return new Error(JSON.stringify(e), e); }

  if (_.isObject(e)) {
    if (_.isString(e.error))      { return new SgError(e.error,     e); }
    if (_.isString(e.Error))      { return new SgError(e.Error,     e); }
    if (_.isString(e.err))        { return new SgError(e.err,       e); }
    if (_.isString(e.Err))        { return new SgError(e.Err,       e); }

    if (_.isString(e.message))    { return new SgError(e.message,   e); }
    if (_.isString(e.msg))        { return new SgError(e.msg,       e); }
  }

  if (e === null)             { return e; }
  if (e === undefined)        { return e; }

  return new Error('' + e);
};
module.exports.toError = toError;

