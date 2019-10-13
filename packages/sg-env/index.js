/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */

// -------------------------------------------------------------------------------------
// exports
//

module.exports.ENV          = ENV;
module.exports.smartValue   = smartValue;

// -------------------------------------------------------------------------------------
//  Functions
//

function ENV(...args) {
  if (!(this instanceof ENV))     { return new ENV(...args); }

  var   self = this;

  self.at = function(name) {
    if (name in process.env)      { return smartValue(process.env[name]); }
  };
}

/**
 *  Makes `value` the right type.
 */
function smartValue(value) {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true')       { return true; }
    if (value.toLowerCase() === 'false')      { return false; }
    if (value.toLowerCase() === 'null')       { return null; }

    if (/^[0-9]+$/.exec(value)) { return parseInt(value, 10); }

    // 2018-12-31T10:08:56.016Z
    if (value.length >= 24 && value[10] === 'T') {
      if (value.match(/\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\d/)) {
        return new Date(value);
      }
    }

    if (/^[0-9]+[.]([0-9]+)?$/.exec(value))   { return +value; }
    if (/^[.][0-9]+$/.exec(value))            { return +value; }

    const m = value.match(/^[/](.+)[/]$/);
    if (m) {
      return new RegExp(m[1]);
    }

    if (/^[\t\n\r ]*[{[]/.exec(value)) {
      try {
        return JSON.parse(value);
      } catch(e) {}
    }
  }

  return value;
}
