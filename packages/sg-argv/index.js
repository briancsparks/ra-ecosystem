
/**
 * @file
 */

const sg                      = require('sg0');

var ARGV = require('minimist')(process.argv.slice(2));

ARGV = sg.reduce(sg.keys(ARGV), ARGV, function(m, key) {
  const snaked = snake_case(key);
  if (key === snaked) {
    return m;
  }

  return sg.kv(m, snaked, ARGV[key]);
});

exports.ARGV = ARGV;
// console.log(sg.inspect(ARGV));

function snake_case(key) {
  return key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}
