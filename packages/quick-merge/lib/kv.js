
/**
 * Returns if x is null or undefined.
 *
 * This is a great compliment to JavaScript's notion of `falsy`. Zero, false, and the empty
 * string are not isnt().
 */
const isnt  = exports.isnt  = function(x) {
  if (x === null)     { return true; }
  if (x === void 0)   { return true; }

  return false;
};

/**
 * The opposite of isnt().
 */
const is  = function(x) {
  return !isnt(x);
};

/**
 * Returns true if any of the items `isnt()`.
 */
const anyIsnt = exports.anyIsnt = function(arr) {
  return arr.reduce((m, item) => m || isnt(item), false);
};

/**
 * Returns `x`, if it is a number, otherwise returns undefined.
 *
 *        const y = theNumber(x) || 42;
 *
 */
const theNumber = exports.theNumber = function(x) {
  if (typeof x === 'number')    { return x; }
  return /* undefined */;
};

/**
 * Returns `x`, if it is a string, otherwise returns undefined.
 *
 *        const y = theString(x) || 'foobar';
 *
 */
const theString = exports.theString = function(x) {
  if (typeof x === 'string')    { return x; }
  return /* undefined */;
};

const arrayify = exports.arrayify = function(arr) {
  if (Array.isArray(arr))   { return arr; }
  return [arr];
};

/**
 *  Builds up an object by adding key/value pairs.
 *
 *  This function is great when used with reduce, since it will add the key / value, and
 *  return the result all in one step. It is also tolerant of the key and/or the value
 *  being null or undefined (and not adding the key / value in this case.)
 *
 *        _.reduce(object, (m, k, v) => {
 *          return kv(m, k, v);
 *        }, {});
 *
 *
 */
const kv = exports.kv = function(m, k, v, ...rest) {
  if (isnt(m))    { return kv({}, k, v, ...rest); }

  var result = m;
  if (is(k) && k !== '' && is(v)) {
    result = { ...result, [k]: v };
  }

  if (rest.length > 1) {
    return kv(result, ...rest);
  }

  return result;
};

/**
 * Builds up an array by pushing a value onto the end, returns the array.
 */
const ap = exports.ap = function(arr, v, ...rest) {
  var result = arr || [];

  if (is(v)) {
    result = [ ...result, ...arrayify(v) ];
  }

  if (rest.length > 0) {
    return ap(result, ...rest);
  }

  return result;
};

/**
 * Dereference (safely) a deep property.
 */
exports.deref = function(x, keys_) {
  if (isnt(x))                      { return /*undefined*/; }
  if (isnt(keys_))                  { return /*undefined*/; }

  if (typeof keys_ === 'string')    { return deref(x, keys_.split('.')); }

  var   keys    = keys_.slice();
  var   result  = x;

  while (keys.length > 0) {
    let   key = keys.shift();
    if (!(result = result[key])) {
      // Falsy, which is OK for things like 0 or empty string to be the final result
      if (keys.length === 0)        { return result; }

      // Not the final item, return undefined
      return /* undefined */;
    }

    // Just continue looking
  }

  return result;
}

const fixKeysForSetOn = function(x, keys_, value) {
  if (anyIsnt([x, keys_, value]))   { return false; }

  const keys = Array.isArray(keys_) ? keys_ : keys_.split('.').map(key => (typeof key === 'string' && key !== '') ? key : null);

  if (anyIsnt(keys))                { return false; }

  return keys;
}

exports.setOn = function(x, keys_, value) {
  const keys = fixKeysForSetOn(x, keys_, value);
  if (keys === false)                             { return value; }

  var owner = x, key;

  while (keys.length > 1) {
    key         = keys.shift();
    owner[key]  = owner[key] || {};
    owner       = owner[key];
  }

  if (!isnt(key = keys.shift())) {
    owner[key] = value;
  }

  return value;
}

/**
 * Returns a key mirror (an Object with keys and values the same.)
 */
const keyMirror = exports.keyMirror = function(keys) {
  if (typeof keys === 'string')                             { return keyMirror(keys.split('.')); }
  if (typeof keys === 'object' && !Array.isArray(keys))     { return keyMirror(Object.keys(keys)); }

  return keys.reduce((m, key) => kv(m, key, key), {});
};

/**
 * Returns the number of keys in the object.
 */
exports.numKeys = function(obj) {
  var count = 0;

  for (var k in obj) {
    count += 1;
  }

  return count;
};

/**
 * Makes `key` a valid identifier.
 */
exports.cleanKey = function(key) {
  return key.replace(/[^a-zA-Z0-9_]/g, '_');
};

const parseDate = exports.parseDate = function(d) {
  //          1(year)   2(mo)  3(day) 4(hr)  5(min) 6(sec) 7(msec) 8(rest)
  const m = /^(\d\d\d\d).(\d\d).(\d\d).(\d\d).(\d\d).(\d\d).(\d\d\d)(.*)$/.exec(d);

  if (m) {
    // zulu-time
    if (m[8] === 'Z')                             { return new Date(d); }
    if (/^ [+-]\d\d\d\d$/.exec(m[8]))             { return new Date(d); }
    if (/^\d\d\d.[+-]\d\d\d\d$/.exec(m[8]))       { return new Date(d); }
  }

  return /* undefined */;
};

/**
 * Intelligently converts values to more appropriate types.
 *
 * Like '0' => the number 0.
 *
 * 2018-10-13T12:32:21.967Z
 * 2018-10-13 03:33:26.934765 +0000
 * 2018-10-13 03:33:26.934 +0000
 * 2018-10-13 03:33:26.934 -0800
 *
 */
const smartValue = exports.smartValue = function(value) {
  if (typeof value === 'string') {
    if (/^[0-9]+$/.exec(value))       { return +value; }
    if (value === 'true')             { return true; }
    if (value === 'false')            { return false; }

    let d = parseDate(value);
    if (d)                            { return new Date(value); }
  }

  return value;
};

/**
 * Make all the attributes on an object be smart.
 */
const smartAttrs = exports.smartAttrs = function(obj) {
  return Object.keys(obj).reduce((m, key) => {
    return kv(m, key, smartValue(obj[key]));
  }, {});
};

/**
 * JSON.parse that does not throw.
 */
exports.safeJSONParse = function(json) {
  if (is(json) && json !== '') {
    try {
      return JSON.parse(json);
    } catch(error) {
    }
  }
};

exports.deepCopy = function(x) {
  return JSON.parse(JSON.stringify(x));
};

