
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

// -------------------------------------------------------------------------------------
// exports
//

exports.flatten = function(arr) {
  return arr.reduce(function(m, item) {
    if (!Array.isArray(item)) { return [ ...m, item ]; }

    return [ ...m, ...exports.flatten(item) ];
  }, []);
};

exports.compact = function(arr) {
  return arr.filter(x => x);
};

exports.isnt = function(x) {
  return (x === null) || _isUndefined(x) || _isNaN(x);

  function _isUndefined(x, undef) {
    return x === undef;
  }
};

exports.anyIsnt = function(arr) {
  return arr.reduce(function(m, item) {
    return m || exports.isnt(item);
  }, false);
};


// -------------------------------------------------------------------------------------
//  Helper Functions
//

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN
function _isNaN(value) {

  // Do we have Number.isNaN (es-2015)?
  if (Number.isNaN) {
    return Number.isNaN(value);
  }

  // Otherwise, NaNs are never equal to themselves, and are the only values that have this weird property
  var n = Number(value);
  return n !== n;
}

