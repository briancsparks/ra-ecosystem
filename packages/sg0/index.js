/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 */

var _                         = require('lodash');
var util                      = require('util');

var isnt, xsnt, anyIsnt, is;

var   sg = {_:_, libs:{util}};

/**
 * Creates an Error object.
 *
 * @param   {string}  code      - The code (like 'ENOENT'.)
 * @param   {string}  message   - Any message.
 * @returns {Error}
 */
sg.error = function(code, message) {

  // Check if arg1 is already an Error object
  if (_.isError(code)) {
    return code;
  }

  // Return our own Error
  var   err = new Error(message || code);
  err.code = code;
  return err;
};

var seconds = sg.seconds = sg.second = 1000,        second = seconds;
var minutes = sg.minutes = sg.minute = 60*seconds,  minute = minutes;
var hours   = sg.hours   = sg.hour   = 60*minutes,  hour   = hours;
var days    = sg.days    = sg.day    = 24*hours,    day    = days;
var weeks   = sg.weeks   = sg.week   = 7*days,      week   = weeks;
var months  = sg.months  = sg.month  = 30*days,     month  = months;
var years   = sg.years   = sg.year   = 365*days,    year   = years;

sg.argvFlag = function(flag) {
  var target = `--${flag}`;
  return process.argv.filter(x => (x === '--' || x === target))[0] === target;
};

sg.argvValue = function(key) {
  var target = `--${key}=`;
  var arg    = process.argv.filter(x => (x === '--' || x.startsWith(target)))[0] || '';
  return arg.split('=')[1];
};

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
 *  Just like _.extend.
 */
sg._extend = function(...args) {
  // var args = sg.reduce(arguments, [], function(m, arg) {
  //   return sg.ap(m, arg);
  // });

  // args.unshift({});
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

  var keyMirror = sg.keyMirrorR(names);

  _.each(Object.keys(keyMirror), function(name) {
    result[name] = sg.extract(collection, name);
  });

  return result;
};

// sg.compact = _.compact;

var stage       = sg.argvValue('stage');
var fastFail    = sg.argvFlag('fastfail');
var warnStack   = sg.argvFlag('warnstack');
var cachedModes = null;     /* sg.modes() result cached */
var forcedTestName;
var forcedModes_;

sg.setStage = function(stg) {
  stage = stg;
};

sg.setFastFail = function(ff = true) {
  fastFail = ff;
};

sg.setModes = function(modesStr) {
  cachedModes = null;

  var modesList   = modesStr.split(',').filter(s => {
    if (!s.startsWith('test:') || s.length < 6)     { return true; }

    forcedTestName = s.split(':')[1];
    return false;
  });

  forcedModes_ = ','+modesList.join(',')+',';
};
if (process.env.SG_FORCED_MODES) {
  sg.setModes(process.env.SG_FORCED_MODES);
}

var getForcedMode = function(name) {
  if (name === 'test' && forcedTestName)    { return forcedTestName; }

  return forcedModes_.indexOf(','+name+',') !== -1;
};

/**
 * Is the app currently running in production (or staging?)
 *
 * 1. Do NOT leak information.
 * 2. Short, fast logging.
 * 3. Permanent, small logs (small by comparison.)
 *
 * @returns
 */
var isProd = function() {
  if (sg.argvFlag('prod'))     { return true; }
  if (forcedModes_)            { return getForcedMode('prod'); }

  return process.env.NODE_ENV === 'production';
};

/**
 * Is the app currently running in a dev environment, like integration or qa?
 *
 * 1. Log 'a lot' of information so that if something needs to be investigated,
 *    logs are avilable, but dont log as much as debug.
 * 2. Leaking information isnt good, but is tolerable if necessary.
 * 3. Log info kept a sprint or two.
 *
 * @returns
 */
var isDev = function() {
  if (sg.argvFlag('dev'))       { return true; }
  if (forcedModes_)             { return getForcedMode('dev'); }

  // Can never do dev things while in prod
  if (isProd())                 { return false; }

  return process.env.NODE_ENV !== 'debug';
};

/**
 * Is the app currently running where someone is actively trying to debug something,
 * even if not at an interactive terminal?
 *
 * 1. Lots of info.
 * 2. Almost blatant disregard for sensitive info (but no creds, of course.)
 * 3. Ephemeral durability of debug info.
 *
 * @returns
 */
var isDebug = function() {
  if (sg.argvFlag('debug'))     { return true; }
  if (forcedModes_)             { return getForcedMode('debug'); }

  // Can never do debug things while in prod
  if (isProd())                 { return false; }

  return process.env.NODE_ENV === 'development';      /* yes, unfortunate name */
};
exports.isDebug = isDebug;

/**
 * Is the app currently running in a test environment?
 *
 * 1. Behave as prod -- do NOT leak information (unless this is a purposeful test to do so.)
 * 2. Log 'a lot' of information so that if something needs to be investigated,
 *    logs are avilable, but dont log as much as debug.
 * 3. Log info kept a sprint or two, unless this is a purposeful test.
 *
 * @returns
 */
var isTest = function() {
  if (sg.argvFlag('test'))     { return true; }
  if (forcedModes_)            { return getForcedMode('test'); }

  // Can never do testg things while in prod
  if (isProd())                 { return false; }

  return sg.argvValue('test');
};

/**
 * Which modes need to be obeyed?
 *
 * @returns
 */
sg.modes = function() {
  if (cachedModes)        { return cachedModes; }

  var prod            = isProd();
  var production      = prod;
  var debug           = isDebug();
  var dev             = isDev();
  var development     = dev;
  var test            = isTest();

  return (cachedModes = sg.merge({prod, debug, test, production, development, dev}));
};

/**
 * sg.modes() is preferred, but of you need a string, here you go.
 *
 * @returns
 */
sg.mode = function() {
  if (sg.modes().prod)            { return 'prod'; }
  if (sg.modes().test === true)   { return 'test'; }
  if (sg.modes().test)            { return sg.modes().test; }
  if (sg.modes().debug)           { return 'debug'; }
  return 'dev';
};

/**
 * Returns input object only if we are in debug mode.
 *
 * @param {*} dbg
 * @returns
 */
sg.debugInfo = function(dbg) {
  if (!sg.modes().debug) {
    return {};
  }

  return dbg;
};

var inspectorName   = 'prod';
var isCli           = null;

// logging goes to stdout or stderr?
const logStream = function(def) {
  if (isCli === null)     { return def; }
  if (isCli)              { return 'error'; }
  return 'log';
};

/**
 * Returns an inspected object.
 *
 * @param {*} x
 * @param {*} colors
 * @returns
 */
sg.inspect = function(x, colors) {
  return sg.inspect[inspectorName](x, colors);
};

sg.mkInspect = function(argv) {

  if (argv) {
    if (argv.fancy) {
      inspectorName = 'debug';
    }
    if (argv.notCli) {
      isCli = false;
    }
    if (argv.isCli) {
      isCli = true;
    }
    return;
  }

  if (sg.modes().prod)  {
    inspectorName = 'prod';
    return;
  }

  if (sg.modes().test) {
    inspectorName = (sg.modes().debug ? 'debug' : 'ndebug');
    return;
  }

  if (sg.modes().debug) {
    inspectorName = 'debug';
    return;
  }

  inspectorName = 'dev';
};
// sg.inspect.current = null;
sg.inspect.debug = function(x, colors) {
  return util.inspect(x, {depth:null, colors: true});
};
sg.inspect.ndebug = function(x, colors) {
  return util.inspect(x, {depth:null, colors: false});
};

sg.inspect.prod = function(x, colors) {
  try {
    return JSON.stringify(x);
  } catch (err) {
  }

  return util.inspect(x);
};

sg.inspect.dev = function(x, colors) {
  return util.inspect(x, {depth:null, colors: colors || sg.modes().debug});
};

const logParams = sg.logParams = function(msg, arg0, ...args) {
  var logged = [msg];

  if (!sg.isnt(arg0)) {
    if (Array.isArray(arg0)) {
      logged.push(sg.inspect(arg0));
    } else {
      logged.push(sg.inspect({...arg0}));
    }
  }

  if (args.length > 0) {
    logged.push(sg.inspect(...args));
  }

  return logged;
};

/**
 * Just like console.log, but with inspect by default.
 *
 * @param {*} msg
 * @param {*} args
 */
sg.log = function(...args /*msg, arg0, ...args*/) {
  console[logStream('log')](...logParams(...args));
};
sg.debugLog = sg.log;

/**
 * Inspect variables while in active development.
 *
 * @param {*} msg
 * @param {*} level
 * @param {*} arg0
 * @param {*} args
 */
sg.dump = function(msg_, level, arg0, ...args) {
  // var   msg = `\n\n     _____     _____     ${msg_}     _____     _____\n\n`;

  var   lines = sg.reduce(_.range(level), '', m => `\n`);
  const msg   = `${lines}     ` + sg.reduce(_.range(level), msg_, (m) => { return `_____     ${m}     _____`; }) + lines;

  console[logStream('error')](..._.compact([msg, arg0 &&  sg.inspect({...arg0}), (args.length > 0) && sg.inspect([...args])]));
  console[logStream('error')](msg);
};

/**
 * Inspect variables while in active development.
 *
 * @param {*} msg
 * @param {*} level
 * @param {*} arg0
 * @param {*} args
 */
sg.dump_if = function(condition, msg_, level, arg0, ...args) {
  if (!condition) { return; }

  // var   msg = `\n\n     _____     _____     ${msg_}     _____     _____\n\n`;

  var   lines = sg.reduce(_.range(level), '', m => `\n`);
  const msg   = `${lines}     ` + sg.reduce(_.range(level), msg_, (m) => { return `_____     ${m}     _____`; }) + lines;

  console[logStream('error')](..._.compact([msg, arg0 &&  sg.inspect({...arg0}), (args.length > 0) && sg.inspect([...args])]));
  console[logStream('error')](msg);
};

/**
 * Just like console.log, but with inspect by default.
 *
 * @param {*} msg
 * @param {*} args
 */
sg.stdlog = function(...args) {
  console[logStream('log')](...logParams(...args));
};

/**
 * Just like sg.log(), but to stderr, so stdout is not affected.
 *
 * @param {*} msg
 * @param {*} args
 */
sg.elog = function(...args) {
  console[logStream('error')](...logParams(...args));
};
sg.edebugLog = sg.elog;

/**
 * Log when a real error happens.
 *
 * @param {*} error
 * @param {*} msg
 * @param {*} arg0
 * @param {*} debugArgs
 */
sg.logError = function(error, msg, arg0, ...debugArgs) {
  console.error(msg, error, sg.inspect({...arg0, msg}), sg.inspect(sg.modes().prod ? [] : (debugArgs || [])));
};

sg.warn = function(msg_, arg0, ...args) {
  var msg = `\n\n     #####     #####     ${msg_}     #####     #####\n\n`;
  console.warn(..._.compact([msg, arg0 &&  sg.inspect({...arg0}), (args.length > 0) && sg.inspect([...args])]));

  if (fastFail) {
    throw(new Error(`FastFail warning ${msg_}`));
  } else if (warnStack) {
    console.error(`Warning ${msg_}`, new Error(`Warning ${msg_}`).stack);
  }
};

sg.warn_if = function(condition, ...args) {
  if (!condition) { return; }

  return sg.warn(...args);
};

sg.nag = function(msg_, arg0, ...args) {
  var msg = `\n\n     .....     .....     ${msg_}     .....     .....\n\n`;
  console.warn(..._.compact([msg, arg0 &&  sg.inspect({...arg0}), (args.length > 0) && sg.inspect([...args])]));
};

sg.nag_if = function(condition, msg_, arg0, ...args) {
  if (!condition) { return; }

  var msg = `\n\n     .....     .....     ${msg_}     .....     .....\n\n`;
  console.warn(..._.compact([msg, arg0 &&  sg.inspect({...arg0}), (args.length > 0) && sg.inspect([...args])]));
};

/**
 *  Just like setTimeout, but with the parameters in the right order.
 */
sg.setTimeout = function(ms, cb) {
  return setTimeout(cb, ms);
};

/**
 * Returns the first key.
 *
 * @param {*} obj
 * @returns
 */
sg.firstKey = function(obj) {
  if (isnt(obj))  { return obj; }

  for (var k in obj) {
    return k;
  }
  return;
};

/**
 * Returns the first key/value pair as [key, value].
 *
 * @param {*} obj
 * @returns
 */
sg.firstKv = function(obj) {
  var k,v;

  if ((k = sg.firstKey(obj))) {
    v = obj[k];
  }

  return [k,v];
};

/**
 * Returns the number of keys in the object.
 *
 * @param {*} obj
 * @returns
 */
sg.numKeys = function(obj) {
  if (isnt(obj))  { return obj; }

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
 *  Just like kv(), so you can return ap(m, 42) or ap(42).
 *
 *  Will fizzle on null or undefined values.
 *
 * @param {Array}       a     - The array to add to.
 * @param {*}           v     - The value.
 * @param {...Object}   rest  - More values.
 *
 * @returns {Array}           - The augmented array.
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

  var length = arr.length;

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

/**
 *  Makes an object where the key for each item is the same as the value.
 *
 * Is recursive.
 */
sg.keyMirrorR = function(x, sep) {
  var result = {};

  if (isnt(x))            { return x; }

  if (_.isString(x))      { return sg.keyMirror(x.split(sep || ',')); }
  if (sg.isObject(x))     { return sg.keyMirror(_.keys(x)); }

  if (!_.isArray(x))      { return result; }

  var mirror = {};
  _.each(x, function(item) {
    mirror = sg.keyMirrorR(item, sep);
    _.extend(result, mirror);
  });

  return result;
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
 * Returns the object, if it is truly an Object, or `def` otherwise.
 *
 * This allows:
 *
 * ```javascript
 *
 *  sg.objekt(x) || {}
 *  sg.objekt(x, {})
 *  sg.objekt(x, {}).attr
 *
 * ```
 *
 * @param {Object|null|undefined} x -- The Object to test
 * @param {*} def                   -- The default
 *
 * @returns {Object|null|undefined|def}
 */
sg.objekt = function(x, def) {
  if (isObject(x))  { return x; }
  return def;
};
var objekt = sg.objekt;

/**
 *  Always returns an Object.
 *
 * * {}  -> x
 * * []  -> {items:x}
 * * *   -> {just:x}
 *
 * @param {*}       x   -- The thing to Object-ify.
 * @param {string}  key -- The object key (replacing `items` or `just`)
 * @returns {Object}
 */
sg.asObject = function(x, key) {
  if (isObject(x))          { return x; }
  if (Array.isArray(x))     { return {[key || 'items']:x}; }
  if (sg.isnt(x))           { return {}; }

  return {[key || 'just']:x};
};
var asObject = sg.asObject;

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
 *  Returns `true` if the item is one of the things in JavaScript that cannot
 *  be manipulated (`null`, `undefined`, `NaN`).
 *
 * @param {*} x
 * @returns true or false
 */
isnt = sg.isnt = function(x) {
  return _.isNull(x) || _.isUndefined(x) || _.isNaN(x);
};

/**
 * Returns x || alternative, but evaluating `sg.isnt(x)`, not just javascript truthiness for `x`.
 *
 * A lot like `sg.isnt()`, the behavior is contingent on x being (`null`, `undefined`, `NaN`).
 * If it is one of those things, returns the `alternative`, otherwise returns `x`.
 *
 * sg.xsnt(0, 'alt')  ==> 0
 * 0 || 'alt'         ==> 'alt'
 *
 * @param {*} x
 * @returns x or alternative
 */
xsnt = sg.xsnt = function(x, alternative) {
  if (isnt(x))        { return alternative; }

  return x;
};

/**
 * Returns `null` if `isnt(x)`, otherwise returns `x`.
 *
 * Forces to be `null` if isnt().
 *
 */
var nullity = sg.nullity = function(x) {
  if (sg.isnt(x)) {
    return null;
  }
  return x;
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
 *  Returns true if the item is a valid item (that you can manipulate and use the value.)
 *
 * @param {*} x
 * @returns true or false
 */
is = exports.is = function(x) {
  return x || (x===0) || (x==='') || (x===false);
};

/**
 * Returns x, unless it `isnt()`, in that case it returns `def`.
 *
 * A log like doing `x || def`, but `def` is only chosen if `isnt(x)`,
 * not for zero or '' or etc. Like when you have untrusted input.
 *
 * @param {*} x
 * @param {*} def
 * @returns
 */
exports.or = function(x, ...rest) {
  if (!sg.isnt(x))            { return x; }
  if (rest.length === 1)      { return rest[0]; }

  return exports.or(...rest);
};

/**
 * Returns x, unless it `isnt()`, in that case it returns `{}`.
 *
 * A log like doing `x || {}`, but `{}` is only chosen if `isnt(x)`,
 * not for zero or '' or etc. Like when you have untrusted input.
 *
 * But you can pass in a second param, which becomes the default.
 *
 * @param {*} x
 * @returns
 */
exports.orO = exports.orObj = exports.orObject = function(x, def ={}, ...rest) {
  if (!sg.isnt(x))            { return x; }
  if (rest.length === 0)      { return def; }

  return exports.or(def, ...rest);
};

/**
 * Returns x, unless it `isnt()`, in that case it returns `[]`.
 *
 * A log like doing `x || []`, but `[]` is only chosen if `isnt(x)`,
 * not for zero or '' or etc. Like when you have untrusted input.
 *
 * But you can pass in a second param, which becomes the default.
 *
 * @param {*} x
 * @returns
 */
exports.orA = exports.orArr = exports.orArray = function(x, def =[], ...rest) {
  if (!sg.isnt(x))            { return x; }
  if (rest.length === 0)      { return def; }

  return exports.or(def, ...rest);
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
 * Split on newline for both *nix and Windows.
 *
 * @param {*} string
 * @returns
 */
sg.splitLn = function(string) {
  return string.split(/\r?\n/g);
};

/**
 * Returns the word with the first char lowercased.
 *
 * @param {*} str
 */
sg.toLowerWord = function(str) {
  if (str.length === 0)     { return str; }
  return str[0].toLowerCase() + sg.rest(str);
};

/**
 * Returns the word with the first char uppercased.
 *
 * @param {*} str
 */
sg.toUpperWord = function(str) {
  if (str.length === 0)     { return str; }
  return str[0].toUpperCase() + sg.rest(str).join('');
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
    if (value.length >= 24 && value[10] === 'T') {
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
    o[sg.cleanKey(k)] = smartValue(v);
  }

  return o;
};

/**
 * Returns a smaller object, suitable for debug logging.
 *
 * @param {object} obj              - The item to be logged.
 * @param {string} [key='items']    - The key if the item that is large and should be shortened.
 *
 * @returns {object}                - A smaller version of obj.
 */
exports.smallItems = function(obj, key = 'items') {
  sg.warn_if(sg.isnt(obj), `${obj} detected in smallItems (${__filename})`);

  if (!obj)                 { return obj; }

  if (!obj[key] || !_.isArray(obj[key])) {
    key = 'payload';
  }

  if (!obj[key] || !_.isArray(obj[key])) {
    return obj;
  }

  var   arr = [];
  if (obj[key].length > 0)    { arr = [obj[key][0]]; }
  if (obj[key].length > 1)    { arr = [...arr, `--- Plus ${obj[key].length-1} more items ---`]; }

  return {...obj, [key]: arr};
};
exports.small = exports.smallItems;

/**
 *  Gets a sub-sub-key.
 */
var deref = sg.deref = function(x, keys_) {
  if (isnt(x))      { return; /* undefined */ }
  if (isnt(keys_))  { return; /* undefined */ }

  var keys    = _.isArray(keys_) ? keys_.slice() : keys_.split('.'), key;
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

/**
 *  Sets value on object (this is the workhorse for , setOna.)
 *
 *  Returns the sanitized keys, or false.
 */
var _setOnIt = function(x, keys_, value) {
  if (isnt(x) || isnt(keys_) || isnt(value))  { return false; }

  var keys  = _.isArray(keys_) ? keys_ : keys_.split('.').map(function(x) { return x==='' ? null: x; });

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
 * sg.choose('a', {a:42}) --> 42
 * sg.choose('a.b', {a:{b:42}}) --> 42
 * sg.choose('x.z', ['key', {key:{z:42},x:{w:'dubya'}}]) --> sg.choose('x.key.z', {key:{z:42},x:{w:'dubya',z:42}}) --> 42
 * sg.choose('x.z', [{z:42},{x:{w:'dubya'}}]) --> sg.choose('x.z', {x:{w:'dubya',z:42}}) --> 42
 *
 * sg.choose('debug', ['prod', {prod:{res:42},debug:{msg:'leak info!'}}]) --> sg.choose('debug', {prod:{res:42},debug:{msg:'leak info!',res:42}}) --> {msg:'leak info!',res:42}
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

  if (_.isString(value)) {
    const n = +value;    // Convert to number
    if (!_.isNaN(n)) {
      value = n;
    }
  }

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
 * A `reduce` implementation that allows easy building of objects.
 *
 * Depending on the return value from the callback, assuming callback signature: (m,v,k) => {...}, and
 * the function would compute key, value.
 *
 * * Object       -- The object is used whole, just like in normal reduce()
 * * [value]      -- A one-element Array means to re-use the k. ( return {...m, [k]: value})
 * * [key, value] -- A two-element Array means to interpret as [key,value]. ( return {...m, [key]: value})
 *   * key can be null to re-use k, like [value].
 * * Otherwise array.length > 2 -- Each item is evaluated individually
 *   * String   - A key-mirror. ['a', 'b', 'c'] -> {a:'a', b:'b', c:'c'}
 *   * Array 0  - Placeholder, so [[], 'b', 'c'] -> {a:'a', b:'b', c:'c'}, not {[b]:c}
 *   * Array 1  - Convert to [k, ...value], and will get processed in Array 2.
 *   * Array 2  - Just like a top-level Array 2. Allows many key-values to be returned: ['a', 'b', [null, {foo:'bar'}], ['quxx', 42]] -> {a:'a', b:'b', [k]:{foo:'bar'}, quxx:42}
 *   * Array >2 - An array ['a', 'b', [null, 1,2,3], [key, 'x', 'y', 'z'], ['z', 9,8,7,6]] -> {a:'a', b:'b', [k]:[1,2,3], [key]: ['x', 'y', 'z'], z:[9,8,7,6]}
 *   * Object   - Merged in -- [[], {a:1, b:42, c:{foo: 'bar'}}]. This is how to return an object whose key-value items are merged into the result.
 *                the first `[]` is needed to keep it from being interpreted by (Array 1) as [k, {...}], which would yield {[k]: {...}}.
 *   * Otherwise not string,array,object -- [/regex/] -> {[k]: /regex/}; [new Date()] -> {[k]: new Date()}
 *
 * This would add one to each value:
 *
 * sg.reduceObj(obj, {}, (m, v, k) => {
 *   return [+value +1];
 * });
 *
 * @param {*} obj
 * @param {*} initial
 * @param {*} options
 * @param {*} fn
 * @returns
 */
sg.reduceObj = function(obj, initial, ...rest) {
  var tser = _.toArray(rest).reverse();
  var [fn, options ={}] = tser;

  if (arguments.length === 2) { return sg.reduceObj(obj, {}, arguments[1]); }

  const isObject = sg.isObject(initial);

  return _.reduce(obj, function(m, v, k, ...rest) {
    const res_ = fn(m, v, k, ...rest);

    // `initial` must be an Object, for any of this to work. If it is not, just act like _.reduce
    if (!isObject)          { return res_; }

    // They can force the result to be any specific object they want by returning an Object
    if (sg.isObject(res_))   { return res_; }

    //
    // This is how the function is intended to be used. The user returns a non-Object, and we
    // interpert it as follows.
    //
    var   res  = res_;

    // They returned null... Just means 'unchanged'
    if (res === null)             { return m; }

    // They just returned, without returning any data... Just means to eithe keep the current k/v, or skip
    if (_.isUndefined(res)) {
      if (options.undefIsSkip)          { return m; }
      else if (options.undefIsKeep)     { return {...m, [k]:v}; }
      else                              { return m; }
    }

    // true is reuse k/v; false is unchanged -- use like filter, or like map, or like ignore
    if (options.likeMap) {
      if (res === true)             { return {...m, [k]:res}; }
      if (res === false)            { return {...m, [k]:res}; }
    } else if (options.likeIgnore) {
      if (res === true)             { return m; }
      if (res === false)            { return {...m, [k]:v}; }
    } else /* like filter - the default */ {
      if (res === true)             { return {...m, [k]:v}; }
      if (res === false)            { return m; }
    }

    // Key-Value pair(s) packed in an Array -- The primary way to use this fn
    if (Array.isArray(res)) {

      if (res.length === 0)       { return m; }   /* unchanged */

      // Re-use key, replace value
      if (res.length === 1) {
        if (!Array.isArray(res[0]) || (res[0].length !== 3)) {
          res = [k, ...res];
        }

        else if (typeof res[0][0] === 'boolean' && typeof res[0][1] === 'string') {
          let orig = res[0][0] ? [k,v] : [];
          res = [[], orig, [res[0][1], res[0][2]]];  /* [[], origKv, newKv] */
        }
      }

      // ['key', {value}], ['key', 'value'], ['key', value] -- value can be any type
      if (res.length === 2 && (_.isString(res[0]) || res[0] === null)) {
        return {...m, [keyOr(res[0])]: res[1]};
      }

      // An Array, but not the primary 2-element method; Look at each element in turn
      return { ...m, ...sg.reduce(res, {}, function(m1, item) {

        // A string Array is a key-mirror
        // ['a', 'b', 'c'] -> {a:'a', b:'b', c:'c'}
        if (_.isString(item)) { return {...m1, [item]:item}; }

        if (Array.isArray(item)) {

          // An empty array is just a null-ish item
          // [[], 'b', 'c'] -> {b:'b', c:'c'}; (Otherwise ['b', 'c'] -> {b:'c'} via the primary method above)
          if (item.length === 0) {
            return m1;
          }

          if (item.length === 1) {
            item = [k, ...item];
          }

          if (item.length === 2) {
            // Just like the primary method, but can have many
            // ['a', 'b', ['q', {foo:'bar'}]]  -> {a:'a', b:'b',   q:{foo:'bar'}}
            // ['a', 'b', [null, {foo:'bar'}]] -> {a:'a', b:'b', [k]:{foo:'bar'}}
            return {...m1, [keyOr(item[0])]: item[1]};
          }

          // An Array of any other size is: {key: Array}

          // ['a', 'b', ['z', 1,2,3]]  -> {a:'a', b:'b',   z:[1,2,3]}
          // ['a', 'b', [null, 1,2,3]] -> {a:'a', b:'b', [k]:[1,2,3]}
          return {...m1, [keyOr(item[0])]: _.rest(item)};

        } else if (sg.isObject(item)) {

          // An Object is just added
          // ['a', 'b', {foo:42}] -> {a:'a', b:'b', foo:42}
          return {...m1, ...item};
        }

        // Not Array or Object
        return {...m1, [k]:item};
      })};
    }

    return {...m, [k]:res};

    function keyOr(x) {
      if (x === null) {
        return k;
      }

      return x;
    }

  }, initial);
};

/**
 * Acts just like reduce, but stops calling fn once a single real value is produced.
 *
 * @param {*} collection       - The Object or Array to reduce
 * @param {*} initial          - The initial state of the result
 * @param {*} fn               - The reducer function
 *
 * @returns {*}                - Whatever the reducer function finds
 */
sg.reduceFirst = function(collection, initial, fn) {
  var   found = false;

  return sg.reduce(collection, initial, (m, v, k, ...rest) => {
    if (found)    { return m; }

    const res = fn(m, v, k, ...rest);
    found     = !sg.isnt(res);
    return res;
  });
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
  if (arguments.length === 1) {
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
  if (arguments.length === 1) {
    return _.min.apply(_, arguments);
  }
  return _.minBy.apply(_, arguments);
};

/**
 * Restore compact.
 *
 * @param {*} arr
 * @returns
 */
sg.compact = function(arr) {
  return arr.filter(Boolean);
};

/**
 * Just like compact, but only removes items according to sg.isnt().
 *
 * @param {*} arr
 * @returns
 */
sg.scrunch = function(arr) {
  return arr.filter(x => !sg.isnt(x));
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
 *  Make sure the item is an array.
 */
sg.toArray = function(x) {
  if (x === null || _.isUndefined(x)) { return []; }
  if (_.isArray(x))                   { return x; }
  return [x];
};

sg.safeRequire = function(filename) {
  try {
    return require(filename);
  } catch(err) {
  }
};

sg.safeJSONParse = function(str) {
  if (str !== '') {
    try {
      return JSON.parse(str);
    } catch(err) {
    //  console.error("Error parsing JSON", str, err);
    }
  }
};

sg.jsonify = function(x) {
  if (typeof x !== 'string') {
    return x;
  }

  return sg.safeJSONParse(x);
};

/**
 * Just like JSON.stringify, but does not throw, and defaults to 2 spaces. use (json, null, null) to
 * to have no whitespace.
 */
sg.safeJSONStringify = function(json, replacer, space) {
  var rest = [replacer, space === null ? null : 2];

  try {
    return JSON.stringify(json, ...rest);
  } catch (err) {
    // console.error(`Failed to stringify JSON`, err);
  }

  return;
};

/**
 * Just like safeJSONStringify, but uses json-stringify-safe, and defaults to 2 spaces. use (json, null, null) to
 * to have no whitespace.
 */
sg.safeJSONStringify2 = function(json, replacer, space, cycleReplacer) {
  var rest = [replacer, space === null ? null : 2, cycleReplacer];

  try {
    var stringify = require('json-stringify-safe');
    return stringify(json, ...rest);
  } catch (err) {
    // console.error(`Failed to stringify JSON`, err);
  }

  return;
};

sg.makeSafeJSON = function(json) {
  return JSON.parse(sg.safeJSONStringify2(json, null, null));
};

/**
 * Make sure x is an Array.
 *
 * @param {*} x                       - The thing to arrayify.
 * @param {Boolean} skipSplitStrings  - Should not split strings
 *
 * @returns {Array}                   - The arrayified x.
 */
sg.arrayify = function(x, skipSplitStrings) {
  if (Array.isArray(x)) {
    return x;
  }
  if (!skipSplitStrings && typeof x === 'string') {
    return x.split(',');
  }
  return _.compact([x]);
};

/**
 * Make sure `x` is an array of at least length `len`.
 */
sg.arrayvalify = sg.arrayvalueify = function(x, def ='', len =1, skipSplitStrings =false) {
  if (Array.isArray(x)) {
    if (x.length >= len) {
      return x;
    }

    if (x.length === 0) {
      if (Array.isArray(def)) {
        const value = _.last(def);
        return sg.arrayvalueify(def, value, len, skipSplitStrings);
      }

      return new Array(len).fill(def);
    }

    // We have an array, but it is too short
    const value = _.last(x);
    return [...x, Array(len - x.len).fill(value)];
  }

  if (typeof x === 'string' && !skipSplitStrings) {
    return sg.arrayvalueify(x.split(','), def, len, skipSplitStrings);
  }

  // `x` is not an Array, make it one
  const value = xsnt(x, def);
  return new Array(len).fill(value);
};

/**
 * Returns true if the string startsWith any of the strings in the Array.
 *
 * @param {*} str   - The string to test.
 * @param {*} arr   - The list of strings.
 *
 * @returns {boolean} - true if the string starts with any of the items in the `arr`
 */
sg.startsWithOneOf = function(str, arr) {
  for (let s of arr) {
    if (str.startsWith(s)) {
      return true;
    }
  }

  return false;
};

/**
 * Just like filter, but returns both lists [items-that-were-true, items-that-were-false].
 *
 * @param {Array}     arr   - The array to split.
 * @param {function}  cb    - The predicate function.
 *
 * @returns {Array[]}
 */
sg.splitArray = function(arr, cb) {
  var a = [],  b = [], len = arr.length;

  for (let i = 0; i < len; ++i) {
    if (cb(arr[i])) {
      a.push(arr[i]);
    } else {
      b.push(arr[i]);
    }
  }

  return [a,b];
};

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
sg.toError = toError;

/**
 * Exports all the stuff on the `lib` onto the `module`.
 *
 * @param {*} modjule
 * @param {*} lib
 */
sg.re_export = sg.exportify = function(modjule, lib) {
  if (sg.isnt(modjule) || sg.isnt(lib))                     { return; }

  for (const key in lib) {
    modjule[key] = lib;
  }

  return modjule;
};

/**
 * Make a function that fills in the `modjule` argument for re_export.
 *
 * @param {*} modjule
 * @returns
 */
sg.re_exporter = function(modjule) {
  return function(lib) {
    return sg.re_export(modjule, lib);
  };
};

// Export functions
_.each(sg, function(fn, name) {
  exports[name] = sg[name];
});
