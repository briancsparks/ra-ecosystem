
/**
 *
 *
 * A quick-merge algorithm for systems that want to work with 'immutable' data, like redux.
 *
 * Strives to:
 *
 * 1. Realize when things have not _really_ changed, so it not returned a different object. For
 *    example, qm({a:'a', b:42}, {b:42}) did not _really_ change, but a nieve JS merge would
 *    give a totally new object.
 * 2. Propigate changes all the way to the top-level object. For example: qm({a:b{c:{d:42}}}, {a:b{c:{d:43}}})
 *    would change `a`, and `a.b`, as well as `a.b.c` (JS will only change `a.b.c`)
 *
 */

const utils                   = require('./utils');

const keyMirrorFromObject     = utils.keyMirrorFromObject;

var options = {quiet:true};
var merge;
var handleMergeObjects;
var handleMergeArrays;

const warn = function(msg, obj) {
  if (options.quiet)  { return; }
  console.log(msg, obj);
};

// ---------- Individual strategy actions --------------------------------------------------------
const awins = function(b,s) {
  return function(a) {
    return a;
  };
};

const bwins = function(b,s) {
  return function(a) {
    return b;
  };
};

var mergeObjects = function(b,s) {
  return function(a) {
    const aKeys     = Object.keys(a);
    const bKeys     = Object.keys(b);
    var   doneKeys  = {};
    var   changed   = false;

    var result = aKeys.reduce((m, key) => {
      doneKeys[key] = true;
      if (a[key] === b[key])  { return m; }   /* no change */

      if (!(key in b))        { return handleMergeObjects(m, key, b[key], s, a[key]); }

      changed = true;
      return handleMergeObjects(m, key, b[key], s, a[key]);
    }, a);

    result = bKeys.reduce((m, key) => {
      if (doneKeys[key])  { return m; }
      return handleMergeObjects(m, key, b[key], s, a[key]);
    }, result);

    return result;
  };
};

const appendArrayBtoA = function(b,s) {
  return function(a) {
    if (!b || b.length === 0) {
      return a;
    }

    if (!a || a.length === 0) {
      return b;
    }

    return [ ...a, ...b ];
  };
};

const appendBtoA = function(b,s) {
  return function(a) {
    if (b === null || b === void(0)) {
      return a;
    }

    return [ ...a, b ];
  };
};

const mergeArrayBtoaByIndex = function(b,s) {
  return function(a) {
    const len = a.length;
    return range(len).reduce((m, n) => {
      if (a[n] === b[n])      { return m; }

      return handleMergeArrays(m, n, b[n], s, a[n]);
    }, a);
  };
};

const removeObjectKey = function(b,s) {         /* <-- 'b', 's' will be shadowed */
  return function(a) {                          /* <-- 'a' will be shadowed */

    // Typical for adding to m
    // return {...m, [key]: merge(b[key],s)(a[key])};

    return function(m0, key, b, s, a) {         /* <-- will be called from end of handleMergeObjects() */

      var changed = false;
      const result = Object.keys(m0).reduce((m, k) => {
        if (k === key) {
          if (k in m0)        { changed = true; }
          return m;
        }
        return { ...m, [k]: m0[k] };
      }, {});

      if (!changed) {
        return m0;
      }

      return result;
    };
  };
};

// ---------- Helpers --------------------------------------------------------
const wrapForUser = function(fn) {      /* <-- used to wrap a strategy-function (is what the user sees as mergeArrayBtoaByIndex */
  return function(userB) {              /* <-- what the user calls to wrap his b object */

    return function(b_,s) {             /* <-- this is the fn that will get called by callFn (part1 - b,s) */
      return function(a) {              /* <-- this is the fn that will get called by callFn (part2 - a) */
        const b = userB;

        return fn(b,s)(a);
      };
    };
  };
};

const callFn = function(b_,s) {          /* <-- b is the user function */
  return function(a) {
    const fn = b_;

    return fn(b_,s)(a);
  };
};

// ---------- The strategy object --------------------------------------------------------
// NULL,UNDEFINED,emptyArray,array,scalar,function,emptyObject,object
var defStrat = {
  merges: {
    object: {
      object      : mergeObjects,
      emptyObject : mergeObjects,
      scalar      : bwins,
      array       : bwins,
      emptyArray  : bwins,
      UNDEFINED   : awins,
      NULL        : awins,
      function    : callFn
    },
    scalar: {
      object      : bwins,
      emptyObject : bwins,
      scalar      : bwins,
      array       : bwins,
      emptyArray  : bwins,
      UNDEFINED   : awins,
      NULL        : awins,
      function    : callFn
    },
    array: {
      object      : appendBtoA,
      emptyObject : appendBtoA,
      scalar      : appendBtoA,
      array       : appendArrayBtoA,
      emptyArray  : awins,
      UNDEFINED   : awins,
      NULL        : awins,
      function    : callFn
    },
    UNDEFINED: {
      otherwise   : bwins,
      function    : callFn
    }
  },
  otherwise: bwins
};
defStrat.merges.emptyObject = defStrat.merges.object;
defStrat.merges.emptyArray  = defStrat.merges.array;
defStrat.merges.NULL        = defStrat.merges.UNDEFINED;

// ---------- Higher-level merging intelligence --------------------------------------------------------
handleMergeArrays = function(m, n, b, s, a) {
  // m[n] = merge(b[n],s)(a[n]);
  // return m;

  const merged = merge(b,s)(a);

  if (typeof merged !== 'function') {
    m[n] = merged;
    return m;
  }

  /* otherwise -- the function will do the merging */
  const fn = merged;
  return fn(m, n, b, s, a);
};

handleMergeObjects = function(m, key, b, s, a) {
  // return {...m, [key]: merge(b[key],s)(a[key])};

  const merged = merge(b,s)(a);

  if (typeof merged !== 'function') {
    return {...m, [key]: merged};
  }

  /* otherwise -- the function will do the merging */
  const fn = merged;
  return fn(m, key, b, s, a);
};

merge = function(b, strategy_) {
  const strategy    = strategy_ || defStrat;
  const { merges }  = strategy;

  return function(a) {
    var   operation;

    const tA      = realTypeof(a);
    const tB      = realTypeof(b);

    if (!options.quiet)     { console.log(`merge`, {a,b,tA,tB}); }

    const mergeA  = merges[tA];
    if (mergeA && tB) {
      let mergeAB = mergeA[tB];
      operation = mergeAB || operation;
    }

    if (typeof operation === 'function') {
      return operation(b, strategy)(a);
    }

    operation = mergeA.otherwise;
    if (typeof operation === 'function') {
      return operation(b, strategy)(a);
    }

    operation = strategy.otherwise;
    return operation(b, strategy)(a);
  };
};

// ---------- The exported fn --------------------------------------------------------
var quickMergeImmutable = function(a, b, ...rest) {
  var result = {};

  if (arguments.length === 1) {
    return a;
  }

  result = merge(b)(a);

  if (rest.length > 0) {
    return exports.quickMergeImmutable(result, ...rest);
  }

  return result;
};
quickMergeImmutable.setOption = function(name, value) {
  options[name] = value;
};
quickMergeImmutable.awins                   = wrapForUser(awins);
quickMergeImmutable.bwins                   = wrapForUser(bwins);
quickMergeImmutable.mergeObjects            = wrapForUser(mergeObjects);
quickMergeImmutable.appendArrayBtoA         = wrapForUser(appendArrayBtoA);
quickMergeImmutable.mergeArrayBtoaByIndex   = wrapForUser(mergeArrayBtoaByIndex);
quickMergeImmutable.removeObjectKey         = wrapForUser(removeObjectKey);
quickMergeImmutable.wrap                    = wrapForUser;

module.exports.quickMergeImmutable          = quickMergeImmutable;

// quickMergeImmutable.setOption('quiet', false);


// ---------- Helpers --------------------------------------------------------
function realTypeof(x) {
  if (x === null)                       { return 'NULL'; }
  if (x === void 0)                     { return 'UNDEFINED'; }
  if (Array.isArray(x)) {
    if (x.length === 0)                 { return 'emptyArray'; }

    return 'array';
  }

  if (x instanceof Date)                { return 'scalar'; }
  if (x instanceof RegExp)              { return 'scalar'; }

  const type = typeof x;

  if (type === 'function')              { return 'function'; }

  if (type === 'object') {
    if (Object.keys(x).length === 0)    { return 'emptyObject'; }

    return 'object';
  }

  return 'scalar';
}

function omit(obj, key_) {
  return Object.keys(obj).reduce((m, key) => {
    if (key === key_)   { return m; }
    return { ...m, [key]: obj[key]};
  }, {});
}

function range(n) {
  var result = [];
  for (var i = 0; i < n; ++i) {
    result.push(i);
  }
  return result;
}


