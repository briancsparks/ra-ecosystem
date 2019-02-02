
const sg                      = require('sg0');
const { _ }                   = sg;

/**
 * cleanString(`        style (1)
 *   foo
 *   bar
 * `);
 *
 * cleanString(`        style (2)
 *   foo
 *   bar`);
 *
 * cleanString(`        style (3)
 *          foo
 *          bar
 * `);
 *
 */

module.exports = function(initial, str, ...rest) {
  var   result = [];

  if (str === true)     { return ['']; }
  if (str === false)    { return null; }

  var   lines  = str.split('\n');
  if (lines.length > 1) {

    // (1) -- first line has length === 0, ignore it
    if (lines[0].length === 0) {
      lines = sg.rest(lines);
    }

    let indent =  sg.reduce(lines, null, (max, line) => {
      // console.error(`line`, sg.inspect({max, line, numLeading:numLeading(line, max)}));
      return Math.min(max || 1000, numLeading(line, max));
    });
    // console.error(`indent`, sg.inspect({indent}));

    lines = sg.reduce(lines, [], (a, line) => {
      return [ ...a, _.compact([initial, line.substring(indent)]).join(' ') ];
    });

    // (3) -- last line has length === 0, ignore it

    result = lines;
  } else {
    result = [_.compact([initial, str]).join(' ')];
  }

  if (rest.length > 0)      { return [ result, exports(...rest)]; }

  return result;
};

function numLeading(str, zeroValue) {
  const l = str.length;
  for (var i = 0; i < l; ++i) {
    if (str[i] !== ' ') {
      return i || zeroValue || i;
    }
  }
  return str.length || zeroValue || str.length;
}
