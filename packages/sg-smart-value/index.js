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
function parseParams(arr, options) {
  var i, argv ={}, arr2 =[], m;

  // Handle and remove any multi-item params (like --afew= 1 2 3), and any that mimimist does not handle
  for (i = 0; i < arr.length; ++i) {
    const j = arrayParam(i, arr, argv, options);

    if (j !== i) {
      i = j;
      continue;
    }

    // handle --no-foo- as false
    if ((m = /^--no-([^=]+)$/.exec(arr[i]))) {
      addKV(argv, m[1], false, options);
      continue;
    }

    // handle --foo- as false
    if ((m = /^--([^=]+)-$/.exec(arr[i]))) {
      addKV(argv, m[1], false, options);
      continue;
    }

    // It was not an array param, add it to the array that will be processed.
    arr2.push(arr[i]);
  }

  const minArgv = require('minimist')(arr2);

  // Update argv with what minimist found
  argv = Object.keys(minArgv).reduce((m, k) => {
    const value = smartValue(minArgv[k]);

    return addKV(m, k, value, options);
  }, argv ||{});

  return argv;
}

/**
 * Parse multi-item params
 *
 * @param {*} i
 * @param {*} arr
 * @param {*} argv
 * @returns
 */
function arrayParam(i, arr, argv, options) {
  if (!Array.isArray(arr))  { return i; }

  // If not the right type, return `i`, meaning we consumed zero params
  var m;
  if (!(m = /^--([^=]+)=$/.exec(arr[i])))    { return i; }

  const k     = m[1];
  const key   = smartKey(k);

  var j, values =[];
  for (j = i+1; j < arr.length; ++j) {
    if (/^--/.exec(arr[j])) { j -= 1; break; }

    values = [ ...values, smartValue(arr[j])];
  }

  addKV(argv, k, values, options);

  return j;
}

/**
 * Add [smartKey(k)]: value.
 *
 * @param {*} argv
 * @param {*} k
 * @param {*} value
 * @param {*} options
 * @returns
 */
function addKV(argv, k, value, options) {
  const key = smartKey(k);

  if (!options.skip_orig && k !== key) {
    argv[k] = value;
  }

  argv[key] = value;
  return argv;
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

