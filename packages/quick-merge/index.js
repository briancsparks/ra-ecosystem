
/**
 * Implementation of quick-merge merging algorithm.
 */

 // The lib file has other helpers like kv(), keyMirror(), isnt(), and the like
const lib                     = require('./lib/kv');

// Export all the lib functions
Object.keys(lib).forEach(key => {
  exports[key] = lib[key];
});

// Forward declarations
var merge, appendArrays, appendToArray, awins, bwins;

const mergeObjects = function(strategy, a, b) {
  var   [aKeys, len, keys]    = keyMirrorFromObject(a);
  var   [bKeys]               = keyMirrorFromObject(b);
  var   result                = {};

  for (var i = 0; i < len; ++i) {
    const key = keys[i];
    if (!bKeys[key]) {
      result[key] = merge(strategy, a[key], b[key]);
    } else {
      result[key] = merge(strategy, a[key], b[key]);
      delete bKeys[key];
    }
  }

  // keys in b, but not in a
  keys  = Object.keys(bKeys);
  len   = keys.length;
  for (var i = 0; i < len; ++i) {
    const key = keys[i];
    result[key] = merge(strategy, a[key], b[key]);
  }

  return result;
};

function deepCopyAny(strategy, a) {
  const tA      = realTypeof(a);

  if (strategy.isScalar(a)) {
    return a;
  }

  if (tA === 'object') {
    return strategy.deepCopyObject(strategy, a);
  }

  if (tA === 'array') {
    return strategy.deepCopyArray(strategy, a);
  }

  return strategy.deepCopy(strategy, a);
}

// Is the deepCopyArray function when b is []
appendArrays = function(strategy, a, b) {
  return [ ...a.map(x => {
    return strategy.deepCopy(strategy, x);
  }),
  ...b.map(x => {
    return strategy.deepCopy(strategy, x);
  })]
};

appendToArray = function(strategy, a, b) {
  return appendArrays(strategy, a, [b]);
};

awins = function(strategy, a, b) {
  if (strategy.isScalar(a)) {
    return a;
  }

  return strategy.deepCopy(strategy, a);
}

bwins = function(strategy, a, b) {
  if (strategy.isScalar(b)) {
    return b;
  }

  return strategy.deepCopy(strategy, b);
}


//
const basicMerges = {
  name  : 'basicMerges',
  merges : {
    object  : {
      object      : mergeObjects,
      scalar      : bwins,
      function    : bwins,        /* resolve overrides */

      otherwise   : awins,
    },
    array   : {
      array       : appendArrays,
      scalar      : appendToArray,
      object      : appendToArray,
      function    : appendToArray,
      NULL        : awins,
      UNDEFINED   : awins,
    },
    scalar  : {
      NULL        : awins,
      UNDEFINED   : awins,
    },
    NULL   : {
      UNDEFINED   : awins,
    },
    UNDEFINED : {
      NULL        : bwins,
    },
    function : {
      "function"  : (x,a,b) => b,        /* resolve overrides */
      NULL        : awins,
      UNDEFINED   : awins,
      /*otherwise :                         resolve overrides */
    },
  },

  otherwise       : bwins,

  deepCopy        : (s,a) => deepCopyAny(s,a),
  deepCopyObject  : (s,a) => mergeObjects(s,a,{}),
  deepCopyArray   : (s,a) => appendArrays(s,a,[]),

  isScalar        : function(x) {                   /* resolve overrides */
    if (x === null)           { return true; }
    if (x === void 0)         { return true; }
    if (Array.isArray(x))     { return false; }

    const type = typeof x;

    if (type === 'object')    { return false; }
    if (type === 'function')  { return true; }

    return true;
  }

};

merge = function(strategy, a, b) {
  const { merges }  = strategy;

  const tA      = realTypeof(a);
  const tB      = realTypeof(b);

  const mergeA  = merges[tA] || {};

  if (typeof mergeA === 'object' && !!mergeA) {
    const mergeAB = mergeA[tB];

    if (typeof mergeAB === 'function') {
      // console.log(`first`, {tA, tB, a, b});
      return mergeAB(strategy, a, b);
    }

    /* otherwise */
    if (typeof mergeA.otherwise === 'function') {
      return mergeA.otherwise(strategy, a, b);
    }
  }

  /* otherwise */
  // console.log(`second`, {tA, tB, a, b, merges:strategy.merges});
  return strategy.otherwise(strategy, a, b);
};


const basicPlusResolveMerges = merge(basicMerges, basicMerges, {
  name  : 'basicPlusResolveMerges',
  merges : {
    object  : {
      "function"  : (x, a, b) => merge(x, a, b()),
    },
    function : {
      "function"  : (x, a, b) => merge(x, a(), b()),
      otherwise   : (x, a, b) => merge(x, a(), b),
    },
  },

  isScalar        : function(x) {
    if (typeof x === 'function') {
      return basicPlusResolveMerges.isScalar(x());
    }

    return basicMerges.isScalar(x);
  },
});

//...
const quickMerge = function(strategy, a, b) {
  return merge(strategy, a, b);
};

exports.quickMerge = exports.qm = function(a, b, c) {

  if (arguments.length === 2) {
    return quickMerge(basicMerges, a, b);
  }

  return quickMerge(a, b, c);
};

exports.quickMergeResolve = exports.qmResolve = function(a, b) {
  return quickMerge(basicPlusResolveMerges, a, b);
};



function keyMirrorFromObject(obj) {
  var   result = {};
  const keys    = Object.keys(obj);
  const l       = keys.length;

  for (var i = 0; i < l; ++i) {
    const key = keys[i];
    result[key] = key;
  }

  return [result, l, keys];
}

function realTypeof(x) {
  if (x === null)           { return 'NULL'; }
  if (x === void 0)         { return 'UNDEFINED'; }
  if (Array.isArray(x))     { return 'array'; }

  const type = typeof x;

  if (type === 'object')    { return 'object'; }
  if (type === 'function')  { return 'function'; }

  return 'scalar';
}

