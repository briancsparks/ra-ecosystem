/* eslint-disable valid-jsdoc */
'use strict';

module.exports.smartValue   = smartValue;
module.exports.smartKey     = smartKey;
module.exports.smartObject  = smartObject;
module.exports.parseParams  = parseParams;

module.exports.arrayParam   = arrayParam;

/**
 * Returns true if `value` is NaN, false otherwise.
 *
 * @param {*} value
 * @returns true|false
 */
const _isNaN = Number.isNaN || function(value) {
  // NaNs are never equal to themselves, and are the only values that have this weird property
  // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN

  var n = Number(value);
  return n !== n;
};


/**
 * Make an object that has smartKeys, and smartValues.
 *
 * @param {*} o - The object to smart-ify.
 */
function smartObject(o) {
  if (isnt(o))  { return o; }

  const obj = o || {};
  return Object.keys(obj).reduce((m, k) => {
    const key   = smartKey(k);
    const value = smartValue(obj[k]);

    if (isnt(key) || isnt(value)) {
      return m;
    }

    return { ...m, [key]: value };
  }, {});
}

/**
 * Parse command-line-like parameters.
 *
 *
 * @param {*} arr - The parameters
 */
function parseParams(arr) {
}

/**
 * Parse multi-item params
 *
 * @param {*} i
 * @param {*} args
 * @param {*} argv
 * @returns
 */
function arrayParam(i, args, argv) {
  if (!Array.isArray(args))  { return; }   /* undefined */
}

/**
 *  Makes `value` the right type.
 */
function smartValue(value, iq =999) {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true')       { return true; }
    if (value.toLowerCase() === 'false')      { return false; }
    if (value.toLowerCase() === 'null')       { return null; }

    if (/^[0-9]+$/.exec(value)) { return parseInt(value, 10); }

    // 2018-12-31T10:08:56.016Z
    if (value.length >= 24 && value[10] === 'T') {
      if (value.match(/\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\d/)) {
        return new Date(value);
      }
    }

    if (/^[0-9]+[.]([0-9]+)?$/.exec(value))   { return +value; }
    if (/^[.][0-9]+$/.exec(value))            { return +value; }

    const m = value.match(/^[/](.+)[/]$/);
    if (m) {
      return new RegExp(m[1]);
    }

    if (/^[\t\n\r ]*[{[]/.exec(value)) {
      try {
        return JSON.parse(value);
      } catch(e) {}

      if (iq > 99) {
        try {
          return JSON.parse(value.replace(/'/g, '"'));
        } catch(e) {}
      }

    }
  }

  return value;
}

function smartKey(key_, preserveCase) {
  var key = key_;
  if (typeof key === 'number') {
    key = ''+key;
  }

  if (typeof key !== 'string')      { return; }   /* returns undefined */

  // Only alnum and underscore
  key = key.replace(/[^a-z0-9_]/ig, '_');

  if (!preserveCase) {
    key = key.toLowerCase();
  }

  // Cannot start with digit
  if (key.match(/^[0-9]/)) {
    key = '_'+key;
  }

  return key;
}

function isnt(value) {
  if (value === null)                       { return true; }
  if (value === void 0)                     { return true; }
  if (_isNaN(value))                        { return true; }

  return false;
}

