
/**
 *
 */

var merge, mergeObjects, appendArrays, appendToArray, awins, bwins;
var resolve;

mergeObjects = function(strategy, a, b) {
  var   [aKeys, len, keys]    = keyMirrorFromObject(a);
  var   [bKeys]               = keyMirrorFromObject(b);
  var   result                = {};

  for (var i = 0; i < len; ++i) {
    const key = keys[i];
    if (!bKeys[key]) {
      result[key] = a[key];
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
    result[key] = b[key];
  }

  return result;
};

appendArrays = function(strategy, a, b) {
  return [...a, ...b];
}

appendToArray = function(strategy, a, b) {
  return [...a, b];
}

awins = function(strategy, a, b) {
  return a;
}

bwins = function(strategy, a, b) {
  return b;
}


//
const basicMerges = {
  merges : {
    object  : {
      object      : mergeObjects,
      scalar      : bwins,
      function    : bwins,

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
      NULL        : awins,
      UNDEFINED   : awins,
    },
  },
  otherwise       : bwins,
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

  // console.log(`second`, {tA, tB, a, b});
  return strategy.otherwise(strategy, a, b);
};


const basicPlusResolveMerges = merge(basicMerges, basicMerges, {
  merges : {
    object  : {
      "function"  : (x, a, b) => merge(x, a, b()),
    },
    function : {
      "function"  : (x, a, b) => merge(x, a(), b()),
      otherwise   : (x, a, b) => merge(x, a(), b),
    },
  },
});

//...
const quickMerge = function(strategy, a, b) {

  // TODO: do not use '|| {}' below, let the merge figure it out
  return mergeObjects(strategy, a || {}, b || {});
};

exports.quickMerge = exports.qm = function(a, b, c) {

  if (arguments.length === 2) {
    return quickMerge(basicMerges, a, b);
  }

  return quickMerge(a, b, c);
};

exports.qmResolve = function(a, b) {
  return quickMerge(basicPlusResolveMerges, a, b);
};


resolve = exports.resolve = function(x) {
  if (typeof x === 'function') {
    return resolve(x());
  }
  return x;
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

