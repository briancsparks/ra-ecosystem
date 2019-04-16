
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;


// -------------------------------------------------------------------------------------
//  Data
//

const debugKeys   = ['debug', 'verbose', 'ddebug', 'vverbose', 'forceSilent', 'silent'];
const systemKeys  = ['warnstack', 'fastfail' ];


// -------------------------------------------------------------------------------------
//  Functions
//

sg.check = function(id, filename, namedArg, x, ...rest) {

  const names     = sg.keys(namedArg);
  const name      = names[0];
  const arg       = namedArg[name];
  const argKeys   = sg.keys(arg);

  if (sg.isnt(arg)) {
    sg.bigNag(`check failed (${arg}) when checking (${id})(1) ${name} in ${filename}`);
  }

  _.each(namedArg, function(value, key) {
    if (sg.isnt(value)) {
      sg.bigNag(`check failed (${value}) when checking (${id})(2) ${name}.${key} in ${filename}, have:`, argKeys);
    }
  });

  if (arguments.length <= 3)      { return; }

  if (typeof x === 'string') {
    let   dottedKeysList = x.split(';');
    _.each(dottedKeysList, function(dottedKey) {
      if (sg.isnt(sg.deref(arg, dottedKey))) {
        sg.bigNag(`check failed (${sg.deref(arg, dottedKey)}) when checking (${id})(3) ${name}.${dottedKey} in ${filename}, have:`, argKeys);
      }
    });

    if (arguments.length === 4)   { return; }

    return sg.check(id, filename, ...rest);
  }

  return sg.check(id, filename, x, ...rest);
};

sg.bigNag = function(msg, ...args) {
  var inspectedArgs = _.map(args, (arg) => {
    return sg.inspect(args);
  });

  console.error(`${decorate(msg,3)}`, ...inspectedArgs);
};


// ---------- For argv ----------
sg.omitDebug = function(obj) {
  return _.omit(obj, ...debugKeys);
};

sg.omitSystem = function(obj) {
  return _.omit(obj, ...systemKeys);
};

sg.pickDebug = function(obj) {
  return _.pick(obj, ...debugKeys);
};

sg.pickParams = function(obj) {
  return _.omit(obj, '_', ...debugKeys, ...systemKeys);
};

sg.extractDebug = function(obj) {
  var   result = sg.extracts(obj, ...debugKeys);

  if (result.verbose)       { result.debug  = result.verbose; }
  if (result.vverbose)      { result.ddebug = result.vverbose; }

  return result;
};

sg.extractParams = function(obj) {
  const params = sg.pickParams(obj);

  return sg.extracts(obj, ...Object.keys(params));
};



// -------------------------------------------------------------------------------------
// exports
//

_.each(sg, (v,k) => {
  module.exports[k] = v;
});

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function decorate(str, level=1) {
  return `     -----     ${str}     -----`;
}

