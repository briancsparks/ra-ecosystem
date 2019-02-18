
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const utils                   = require('./utils');

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//


// -------------------------------------------------------------------------------------
// exports
//

exports.stitch = stitch;

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function stitch(arrr) {
  if (typeof arrr === 'string') { return stitch(arrr.split(/[ \t]/g)); }
  return utils.compact(utils.flatten(arrr.map(x => stitchLevel1(x))));
}

// anyIsnt() wipes us out; if arrr is Array, make it 1-deep only, otherwise arrr
function stitchLevel1(arrr) {
  if (!Array.isArray(arrr)) { return arrr; }

  const origLen   = arrr.length;
  const arrr2     = utils.compact(arrr.map(item => stitchLower(item)));

  if (arrr2.length === origLen) {
    return arrr2;
  }

  return null;
}

// anyIsnt() wipes us out; return non-Array
function stitchLower(arrr) {
  if (!Array.isArray(arrr)) { return arrr; }

  const arrr2 = arrr.map(item => stitchLower(item));
  if (utils.anyIsnt(arrr2)) {
    return null;
  }

  return arrr2.join('');
}

