
/**
 * @file
 */

var _                         = require('lodash');
var util                      = require('util');

var   sg = {_:_};

var seconds = sg.seconds = sg.second = 1000,        second = seconds;
var minutes = sg.minutes = sg.minute = 60*seconds,  minute = minutes;
var hours   = sg.hours   = sg.hour   = 60*minutes,  hour   = hours;
var days    = sg.days    = sg.day    = 24*hours,    day    = days;
var weeks   = sg.weeks   = sg.week   = 7*days,      week   = weeks;
var months  = sg.months  = sg.month  = 30*days,     month  = months;
var years   = sg.years   = sg.year   = 365*days,    year   = years;

var forcedModes_;
sg.setModes = function(modes) {
  forcedModes = ','+modes+',';
};

const getForcedMode = function(name) {
  return indexOf(forcedModes_, ','+name+',') !== -1;
};

const isProd = function() {
  if (sg.argvFlag('prod'))     { return true; }
  if (forcedModes_)            { return getForcedMode('prod'); }

  return process.env.NODE_ENV === 'production';
};

const isDebug = function() {
  if (sg.argvFlag('debug'))     { return true; }
  if (forcedModes_)             { return getForcedMode('debug'); }

  return process.env.NODE_ENV !== 'production';
};

const isTest = function() {
  if (sg.argvFlag('test'))     { return true; }
  if (forcedModes_)            { return getForcedMode('test'); }

  return false;
};

sg.modes = function() {
  const prod            = isProd();
  const production      = prod;
  const debug           = isDebug();
  const development     = debug;
  const test            = isTest();

  return sg.merge({prod, debug, test, production, development});
};

sg.mode = function() {
  if (sg.modes().prod)  { return 'prod'; }
  if (sg.modes().test)  { return 'test'; }
  if (sg.modes().debug) { return 'debug'; }
};


/**
 * Returns an inspected object.
 *
 * @param {*} x
 * @param {*} colors
 * @returns
 */
sg.inspect = function(x, colors) {
  return util.inspect(x, {depth:null, colors: colors || false});
};

/**
 *  Just like setTimeout, but with the parameters in the right order.
 */
sg.setTimeout = function(ms, cb) {
  return setTimeout(cb, ms);
};

sg.firstKey = function(obj) {
  for (var k in obj) {
    return k;
  }
  return ;
};

sg.numKeys = function(obj) {
  var num = 0;
  for (var k in obj) {
    num++;
  }

  return num;
};

/**
 *  Build {k:v}
 */
var kv = sg.kv = function(o, k, v) {
  if (arguments.length === 2) {
    return kv(null, o, k);
  }

  o = o || {};

  if (isnt(k))              { return o; }
  if (_.isUndefined(v))     { return o; }

  o[k] = v;
  return o;
};

/**
 *  Build {key:k, vName:v}
 */
var kkvv = sg.kkvv = function(o, k, v, vName) {
  if (arguments.length === 2) {
    return kkvv(null, o, k, 'value');
  }

  if (arguments.length === 3) {
    return kkvv(null, o, k, v);
  }

  o         = o || {};
  o.key     = k;
  o[vName]  = v;

  return o;
};

/**
 *  Build {k:v}, where the key is a dotted-key
 */
var dottedKv = sg.dottedKv = function(o, k, v) {
  if (arguments.length === 2) {

    if (_.isArray(o)) { return dottedKv(null, o.join('.'), k); }
    return kv(null, o, k);
  }

  if (_.isArray(k)) { return dottedKv(o, k.join('.'), v); }

  o = o || {};
  o[k] = v;
  return o;
};

/**
 *  Build [v]
 *
 *  Just like kv(), so you can return ap(m, 42) or ap(42)
 */
var ap = sg.ap = function(a, v, ...rest) {
  if (arguments.length === 1)   { return sg.ap(null, arguments[0]); }

  a = a || [];

  if (!_.isUndefined(v)) {
    a.push(v);
  }

  if (rest.length > 0) {
    return ap(a, ...rest);
  }

  return a;
};

/**
 *  Pushes the item into the array, and returns the index of where it got
 *  pushed at.
 *
 *  If x is undefined, `_push()` will not push it, and returns undefined.
 */
sg.push = function(arr, x) {
  if (_.isUndefined(x))     { return x; }

  const length = arr.length;

  arr.push(x);

  return length;
};
sg._push = sg.push;

/**
 *  Returns the keys of an object.
 *
 *  Just like _.keys, except it will return null or undefined if given an
 *  input that isnt().
 */
sg.keys = function(x) {
  if (isnt(x))            { return x; }

  return _.keys(x);
};

/**
 *  Makes an object where the key for each item is the same as the value.
 */
sg.keyMirror = function(x, sep) {
  var result = {};

  if (isnt(x))            { return x; }

  if (_.isString(x))      { return sg.keyMirror(x.split(sep || ',')); }
  if (sg.isObject(x))     { return sg.keyMirror(_.keys(x)); }

  if (!_.isArray(x))      { return result; }

  _.each(x, function(item) {
    result[item] = item;
  });

  return result;
};

sg.argvFlag = function(flag) {
  const target = `--${flag}`;
  return process.argv.map(x => (x === '--' || x === target))[0] === target;
};

/**
 *  Is the parameter strictly an Object (and not an Array, or Date, or ...).
 */
var isObject = sg.isObject = function(x) {
  if (!_.isObject(x))                     { return false; }
  if (_.isArray(x)    || _.isDate(x))     { return false; }
  if (_.isFunction(x) || _.isRegExp(x))   { return false; }
  if (_.isError(x))                       { return false; }

  return true;
};

/**
 *
 */
var isPod = sg.isPod = function(x) {
  if (_.isString(x))            { return true; }
  if (_.isNumber(x))            { return true; }
  if (_.isBoolean(x))           { return true; }
  if (_.isDate(x))              { return true; }
  if (_.isRegExp(x))            { return true; }

  return false;
};

/**
 *  Returns true if the argument === null or === undefined.
 *
 */
isnt = sg.isnt = function(x) {
  return _.isNull(x) || _.isUndefined(x);
};

/**
 *  Returns true if any of the items in `argv` isnt().
 *
 */
anyIsnt = sg.anyIsnt = function(argv) {
  return sg.reduce(argv, false, (m, arg) => {
    if (m !== false) { return m; }
    return sg.isnt(arg);
  });
};

/**
 *  Is the value in the list-as-a-sting.
 *
 *  strList : 'a,foo,barbaz'
 *  value   : 'a'
 *
 *  Must do ',a,foo,barbaz,'.indexOf(...)
 */
sg.inList = function(strList, value, sep_) {
  var sep = sep_ || ',';

  var surrounded = sep + strList + sep;
  return surrounded.indexOf(sep + value + sep) !== -1;
};

/**
 *  Makes the key a valid identifier (letter, digit, or underscore).
 */
sg.cleanKey = function(key) {
  return key.replace(/[^a-zA-Z0-9_]/g, '_');
};

/**
 * Returns the word with the first char lowercased.
 *
 * @param {*} str
 */
sg.toLowerWord = function(str) {
  return str[0].toLowerCase() + sg.rest(str);
};

/**
 * Returns the word with the first char uppercased.
 *
 * @param {*} str
 */
sg.toUpperWord = function(str) {
  return str[0].toUpperCase() + sg.rest(str);
};

/**
 * Returns if the string or char is lower case.
 *
 * @param {*} str
 * @returns
 */
sg.isLowerCase = function(str) {
  return str === str.toLowerCase();
};

/**
 * Returns if the string or char is upper case.
 *
 * @param {*} str
 * @returns
 */
sg.isUpperCase = function(str) {
  return str === str.toUpperCase();
};

/**
 *  Makes x the right type.
 */
var smartValue = sg.smartValue = function(value) {
  if (_.isString(value)) {
    if (value === 'true')       { return true; }
    if (value === 'false')      { return false; }
    if (value === 'null')       { return null; }

    if (/^[0-9]+$/.exec(value)) { return parseInt(value, 10); }

    // 2018-12-31T10:08:56.016Z
    if (value.length >= 24 && value[10] == 'T') {
      if (value.match(/\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\d/)) {
        return new Date(value);
      }
    }

    if (/^[0-9]+[.]([0-9]+)?$/.exec(value))   { return +value; }
    if (/^[.][0-9]+$/.exec(value))            { return +value; }
  }

  return value;
};

/**
 * Makes each attribute on obj the right type.
 */
var smartAttrs = sg.smartAttrs = function(obj) {
  return _.reduce(obj, function(m, value, key) {
    return sg.kv(m, key, smartValue(value));
  }, {});
};

/**
 *  Build {k:v}, but do not set the value if k or v are undefined/null.
 *
 *  This allows passing in undefined, and getting the original object
 *  back, without mods.
 */
var kvSmart = sg.kvSmart = function(o, k, v) {
  if (arguments.length === 2) {
    return kvSmart(null, o, k);
  }

  o = o || {};

  if (!isnt(k) && !isnt(v)) {
    o[cleanKey(k)] = smartValue(v);
  }

  return o;
};

/**
 *  Gets a sub-sub-key.
 */
var deref = sg.deref = function(x, keys_) {
  if (isnt(x))      { return /* undefined */; }
  if (isnt(keys_))  { return /* undefined */; }

  var keys    = _.isArray(keys_) ? keys_.slice() : keys_.split('.'), key;
  var result  = x;

  while (keys.length > 0) {
    key = keys.shift();
    if (!(result = result[key])) {
      // We got a falsy result.  If this was the last item, return it (so, for example
      // we would return a 0 (zero) if looked up.
      if (keys.length === 0) { return result; }

      /* otherwise -- return undefined */
      return /* undefined */;
    }
  }

  return result;
};

/**
 *  Sets value on object (this is the workhorse for , setOna.)
 *
 *  Returns the sanitized keys, or false.
 */
var _setOnIt = function(x, keys_, value) {
  if (isnt(x) || isnt(keys_) || isnt(value))  { return false; }

  var keys  = _.isArray(keys_) ? keys_ : keys_.split('.').map(function(x) {return x==='' ? null: x});

  if (anyIsnt(keys))                          { return false; }

  return keys;
};

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
var setOn = sg.setOn = function(x, keys_, value) {
  var keys = _setOnIt(x, keys_, value);
  if (keys === false)                       { return value; }

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


/**
 *  Sets sub-sub-key of object as an array, and always returns the passed-in value.
 *
 *  setOna(x, 'foo.bar.baz', 42)
 *
 *  x = {foo:{bar:{baz:[42]}}}
 *
 *  Does not set the sub-object if value is undefined. This allows:
 *
 *      // if abc is not set on  options, x.foo.bar.baz does not get set
 *      setOn(x, 'foo.bar.baz', options.abc);
 */
var setOna = sg.setOna = function(x, keys_, value) {
  var keys = _setOnIt(x, keys_, value);
  if (keys === false)                       { return value; }

  var owner = x, key;

  while (keys.length > 1) {
    key           = keys.shift();
    if (isnt(owner[key])) {
      owner[key]  = _.isNumber(keys[0]) ? [] : {};
    }
    owner         = owner[key];
  }

  if (!isnt(key = keys.shift())) {
    owner[key] = owner[key] || [];
    owner[key].push(value);
  }

  return value;
};

/**
 * Merges `aug` into each top-level property of `all`.
 *
 * If `aug` is a string, it is a key into `all`.
 *
 * @param {*} aug
 * @param {*} all
 * @returns
 */
sg.augmentAllWith = function(aug, all) {
  if (_.isString(aug))  { return sg.augmentAllWith(all[aug], all); }

  return sg.reduce(all, {}, function(m, v, k) {
    return sg.kv(m, k, sg.merge(aug, v));
  });
};

/**
 * Returns obj[key].
 *
 * @param {*} key
 * @param {*} obj
 * @returns
 */
sg.choose = function(key, obj) {
  if (_.isArray(obj)) {
    return sg.choose(key, sg.augmentAllWith(...obj));
  }

  return sg.deref(obj, key);
};

/**
 * Converts to boolean.
 *
 * @param {*} value
 * @returns
 */
sg.trueOrFalse = function(value_) {
  var value = value_;
  if (value === true || value === false)  { return value; }
  if (value === 'true')                   { return true; }
  if (value === 'false')                  { return false; }

  if (_.isString(value)) { value = +value; }    // Convert to number
  return !!value;
};
sg.tf = sg.trueOrFalse;   // alias

/**
 *  Just like _.each, except adds three params to the callback:
 *
 *  * The numeric index (call invocation number)
 *  * first
 *  * last
 */
sg.each = sg._each = function(collection, fn, context) {
  var numericIndex = 0;
  var length = collection.length || sg.numKeys(collection);

  _.each(collection, function(element, index, coll) {
    var args = [element, index, {collection: coll, i:numericIndex, first:(numericIndex === 0), last:(numericIndex+1 === length), length:length}];
    numericIndex += 1;
    return fn.apply(this, args);
  }, context);
};

/**
 * Like _.reduce, but the parameters are in the right places.
 *
 * @param {*} collection
 * @param {*} initial
 * @param {*} fn
 * @returns
 */
sg.reduce = function(collection, initial, fn) {
  return _.reduce(collection, fn, initial);
};

/**
 * Restore rest().
 *
 * @returns
 */
sg.rest = function() {
  return _.drop.apply(_, arguments);
};

/**
 * Restore max().
 *
 * @returns
 */
sg.max = function() {
  if (arguments.length == 1) {
    return _.max.apply(_, arguments);
  }
  return _.maxBy.apply(_, arguments);
};

/**
 * Restore min().
 *
 * @returns
 */
sg.min = function() {
  if (arguments.length == 1) {
    return _.min.apply(_, arguments);
  }
  return _.minBy.apply(_, arguments);
};

// From https://github.com/lodash/lodash/wiki/Migrating
sg.pluck        = _.map;
sg.head         = _.take;
sg.last         = _.takeRight;
sg.initial      = _.dropRight;
sg.any          = _.some;
sg.all          = _.every;
sg.compose      = _.flowRight;
sg.contains     = _.includes;
sg.findWhere    = _.find;
sg.indexBy      = _.keyBy;
sg.invoke       = _.invokeMap;
sg.mapObject    = _.mapValues;
sg.pairs        = _.toPairs;
sg.where        = _.filter;


// TBD:
// sg.flatten should be deep, lodash is shallow
// sg.indexOf 3rd parameter handling
// sample, object, omit(By), pick(By), sortedIndex, uniq(By),


/**
 *  Just like _.extend, but does not mutate the 1st arg.
 */
sg.extend = function() {
  var args = sg.reduce(arguments, [], function(m, arg) {
    return sg.ap(m, arg);
  });

  args.unshift({});
  return _.extend.apply(_, args);
};

/**
 *  Smart sg.extend().
 */
sg.smartExtend = function() {
  var args = sg.reduce(arguments, [], function(m, arg) {
    return sg.ap(m, sg.isObject(arg) ? sg.smartAttrs(arg) : arg);
  });

  args.unshift({});
  return _.extend.apply(_, args);
};

/**
 *  Merge objects.
 */
sg.merge = function() {
  var args = sg.reduce(arguments, [], function(m, arg) {
    return sg.ap(m, sg.reduce(arg, {}, function(m, value, key) {
      return sg.kv(m, key, value);
    }));
  });

  args.unshift({});
  return _.extend.apply(_, args);
};

/**
 * Pulls the item out of the object and returns it.
 *
 * @param {*} collection_
 * @param {*} name
 * @returns
 */
sg.extract = function(collection_, name) {
  var collection  = collection_ || {};
  var value       = collection[name];

  delete collection[name];
  return value;
};

/**
 * Pulls the items out of the object and returns a new object with those items.
 *
 * @param {*} collection
 * @returns
 */
sg.extracts = function(collection /*, names... */) {
  var names  = _.drop(arguments);
  var result = {};

  _.each(names, function(name) {
    result[name] = sg.extract(collection, name);
  });

  return result;
};

/**
 *  Make sure the item is an array.
 */
sg.toArray = function(x) {
  if (x === null || _.isUndefined(x)) { return []; }
  if (_.isArray(x))                   { return x; }
  return [x];
};

var safeJSONParse = sg.safeJSONParse = function(str) {
  if (str !== '') {
    try {
      return JSON.parse(str);
    } catch(err) {
//      console.error("Error parsing JSON", str, err);
    }
  }
};





// Export functions
_.each(sg, function(fn, name) {
  exports[name] = sg[name];
});
