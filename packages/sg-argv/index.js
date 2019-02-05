
/**
 * @file
 */

const sg                      = require('sg0');

sg.ARGV = ARGV;
// console.log(sg.inspect(ARGV));

sg._.each(sg, (v, k) => {
  exports[k] = v;
});

function snake_case(key) {
  return key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function ARGV(input = process.argv) {
  var argv = require('minimist')(input.slice(2));

  argv = sg.reduce(sg.keys(argv), argv, function(m, key) {
    const snaked = snake_case(key);
    if (key === snaked) {
      return m;
    }

    return sg.kv(m, snaked, argv[key]);
  });

  return argv;
}

