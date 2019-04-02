
const sg                      = require('sg0');
const { _ }                   = sg;

exports.args = function(fn, ...args0) {
  return function(...args) {
    return _apply(fn, ...args0, ...args);
  };
};

// Typically: _bind(func, obj);
exports._bind = function(fn, ...args0) {
  return Object.bind(fn, ...args0);
};


exports.delay = delay;
exports.magic = magic;
exports._apply = _apply;

function _apply(fn, ...args) {
  return fn(...args.map(arg => unjustX(resolveOnAll('applyArg', arg))));
}



// ================================================================================================
// Create

function magic(fn, args_, ...rest) {
  if (arguments.length === 1)                             { return magic(fn, []); }
  if (arguments.length !== 2)                             { return magic(fn, [args_, ...rest]); }

  // Arrayify
  const args = (typeof args_ !== 'object' || !('length' in args_)) ? [args_] : args_;

  return [[fn], args];
}

// function delay(x, ...rest) {
//   return onEvent('applyArg', magic(x), ...rest);
// }

function delay(x, ...rest) {
  return magic(onEvent('applyArg', magic(x), ...rest));
}

function onEvent(name_, x, ...rest) {
  const name = `on${name_}`;

  return function(event) {
    return hocuspocus(event === name, x, ...rest);
  };
}

function unjustX(x={}) {
  if (!_.isObject(x)) {
    return x;
  }

  if ('__just__' in x) {
    return x.__just__;
  }

  return x;
}



// ================================================================================================
// Resolve

const resolveAll = mkResolveAll(function(x, ...args){
  // console.log(`resolveAll`, sg.inspect({x, args}));
  return dieThrowing('RESOLVEALL', x, args);
});

function resolve(x, ...args) {
  // if (typeof x === 'function') {
  //   return x(...args);
  // }

  // return x;
  // return justX(x);
  return abracadabra(x, ...args);
}

function mkResolveAll(failFn) {
  const fn = function(x, ...args) {
    const resolution = resolve(x, ...args);

    // if (_.isFunction(x) && unjustX(resolution) === x) {
    //   return failFn(x, ...args);
    // }

    // if (_.isFunction(resolution)) {
    //   return fn(resolution);
    // }

    if (resolution === x) {
      return failFn(x, ...args);
    }

    if (isMagic(resolution)) {
      return fn(resolution);
    }

    return resolution;
  };

  return fn;
}

function dieThrowing(name, x, args) {
  const error = new Error(`E${name}`);
  // console.error(`dieThrowing`, error.stack);
  throw error;
}

function justX(x) {
  return {__just__: x};
}


function resolveOn(eventName, x) {
  return resolve(x, `on${eventName}`);
}

function resolveOnAll(eventName, x) {
  return resolveAll(x, `on${eventName}`);
}

function hocuspocus(condition, x, ...rest) {
  if (condition) {
    return abracadabra(x, ...rest);
  }

  return justX(x);
}

// x: [[f()], [...]] --> f(...), or just x
function abracadabra(x, ...rest) {

  if (sg.isnt(x))                                                           { return justX(x); }
  if (typeof x !== 'object' || !('length' in x) || x.length !== 2)          { return justX(x); }
  if (x.length > 2 )                                                        { return justX(x); }

  const [ x0, x1=[] ] = x;
  if (typeof x0 !== 'object' || !('length' in x0) || x0.length !== 1)       { return justX(x); }
  if (typeof x1 !== 'object' || !('length' in x1))                          { return justX(x); }

  const [ fn ] = x0;
  if (typeof fn !== 'function')                                             { return justX(x); }

  return _apply(fn, ...x1, ...rest);
}

function isMagic(x) {

  if (sg.isnt(x))                                                           { return false; }
  if (typeof x !== 'object' || !('length' in x) || x.length !== 2)          { return false; }
  if (x.length > 2 )                                                        { return false; }

  const [ x0, x1=[] ] = x;
  if (typeof x0 !== 'object' || !('length' in x0) || x0.length !== 1)       { return false; }
  if (typeof x1 !== 'object' || !('length' in x1))                          { return false; }

  const [ fn ] = x0;
  if (typeof fn !== 'function')                                             { return false; }

  return true;
}
