/* eslint-disable valid-jsdoc */

/**
 * @file
 *
 * * isnt
 * * isObject
 * * kv
 * * keys(x, sep =',')        -- x can be string, Object, or Array
 *                               (Array of Objects have all objects keys)
 * * keyMirror(x, sep =',')   -- x can be string, Object, or Array
 * * deref
 * * setOn
 * * compact
 * * arrayify
 * * pad(len, x, paddingChar =['0' or ' ']) -- '0' if x is a Number, ' ' otherwise
 */

/**
 *  Returns `true` if the item is one of the things in JavaScript that cannot
 *  be manipulated (`null`, `undefined`, `NaN`).
 *
 * @param {*} x
 * @returns true or false
 */
module.exports.isnt = function(x) {
  return x === null || x === void(0) || (x !== x);
};
const isnt = module.exports.isnt;

/**
 *  Is the parameter strictly an Object (and not an Array, or Date, or ...).
 */
module.exports.isObject = function(x) {
  if (typeof x !== 'object')        { return false; }
  if (Array.isArray(x))             { return false; }
  if (typeof x === 'function')      { return false; }
  if (typeof x === 'string')        { return false; }
  if (typeof x === 'number')        { return false; }
  if (x instanceof Date)            { return false; }
  if (x instanceof RegExp)          { return false; }
  if (x instanceof Error)           { return false; }

  return true;
};
var isObject = module.exports.isObject;

/**
 *  Build {k:v}
 */
module.exports.kv = function(o, k, v) {
  if (arguments.length === 2) {
    return kv(null, o, k);
  }

  if (isnt(k))              { return o; }
  if (k === void(0))        { return o; }

  return {...(o ||{} ), [k]: v};
};
const kv = module.exports.kv;

/**
 *  Returns the keys of an object.
 *
 *  Just like _.keys, except it will return null or undefined if given an
 *  input that isnt().
 */
module.exports.keys = function(x, sep) {
  if (isnt(x))            { return x; }

  if (typeof x === 'string')            { return x.split(sep || ','); }

  if (Array.isArray(x)) {
    if (x.length === 0)                 { return x; }
    if (typeof x[0] === 'string')       { return x; }
    if (isObject(x[0])) {
      var result = x.reduce((m, item) => {
        return {...m, ...keyMirror(item)};
      }, {});

      return Object.keys(result);
    }

    return x;
  }

  return Object.keys(x);
};
const keys = module.exports.keys;

/**
 *  Makes an object where the key for each item is the same as the value.
 */
module.exports.keyMirror = function(x, sep) {
  var result = {};

  // if (isnt(x))                    { return x; }

  // if (typeof x === 'string')      { return keyMirror(x.split(sep || ',')); }
  // if (isObject(x))                { return keyMirror(Object.keys(x)); }

  // if (!Array.isArray(x))          { return result; }

  // x.forEach(function(item) {
  //   result[item] = item;
  // });

  keys(x, sep).forEach(function(item) {
    result[item] = item;
  });

  return result;
};
const keyMirror = module.exports.iskeyMirrornt;

/**
 *  Gets a sub-sub-key.
 */
module.exports.deref = function(x, keys_) {
  if (isnt(x))      { return; /* undefined */ }
  if (isnt(keys_))  { return; /* undefined */ }

  var keys    = Array.isArray(keys_) ? keys_.slice() : keys_.split('.'), key;
  var result  = x;

  while (keys.length > 0) {
    key = keys.shift();
    if (!(result = result[key])) {
      // We got a falsy result.  If this was the last item, return it (so, for example
      // we would return a 0 (zero) if looked up.
      if (keys.length === 0) { return result; }

      /* otherwise -- return undefined */
      return; /* undefined */
    }
  }

  return result;
};
const deref = module.exports.deref;

/**
 *  Sets sub-sub-key of object, and always returns the passed-in value.
 *
 *  setOn(x, 'foo.bar.baz', 42)
 *
 *  x = {foo:{bar:{baz:42}}}
 *
 *  Does not set the sub-object if value is undefined. This allows:
 *
 *      // if abc is not set on  options, x.foo.bar.baz does not get set
 *      setOn(x, 'foo.bar.baz', options.abc);
 */
module.exports.setOn = function(x, keys_, value) {
  var keys = arrayify(keys_, '.');
  var owner = x, key;

  while (keys.length > 1) {
    key = keys.shift();
    owner[key] = owner[key] || {};
    owner = owner[key];
  }

  if (!isnt(key = keys.shift())) {
    owner[key] = value;
  }

  return value;
};
const setOn = module.exports.setOn;

/**
 * Restore compact.
 *
 * @param {*} arr
 * @returns
 */
module.exports.compact = function(arr) {
  return arr.filter(Boolean);
};
const compact = module.exports.compact;

/**
 * Make sure x is an Array.
 *
 * @param {*} x             - The thing to arrayify.
 * @param {string} sep      - Should not split strings
 *
 * @returns {Array}                   - The arrayified x.
 */
module.exports.arrayify = function(x, sep = ',') {
  if (Array.isArray(x)) {
    return x;
  }

  if (sep && typeof x === 'string') {
    return x.split(sep);
  }
  return compact([x]);
};
const arrayify = module.exports.arrayify;

/**
 * Pads the string.
 *
 * @param {*} len
 * @param {*} x_
 * @param {*} ch_
 * @returns
 */
module.exports.pad = function(len, x_, ch_) {
  var x   = ''+x_;
  var ch  = ch_ || (typeof x_ === 'number') ? '0' : ' ';

  while (x.length < len) {
    x = ch + x;
  }

  return x;
};
const pad = module.exports.pad;

