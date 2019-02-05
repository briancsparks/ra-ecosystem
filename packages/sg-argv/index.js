
/**
 * @file
 */

const sg                      = require('sg0');
const { _ }                   = sg;

sg.ARGV = ARGV;
// console.log(sg.inspect(ARGV));

sg._.each(sg, (v, k) => {
  exports[k] = v;
});

function snake_case(key) {
  return key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function ARGV(input = process.argv) {
  var args = [], argv = {};

  args    = preProcess(input.slice(2), argv);
  argv    = sg.smartExtend(argv, require('minimist')(args));
  // var argv2   = {};

  const keys = sg.keys(argv);
  for (var i = 0; i < keys.length; ++i) {
    let   key     = keys[i];
    let   snaked  = snake_case(key);

    // i = arrayParam(i, argv, keys);

    if (key !== snaked) {
      argv[snaked] = argv[keys[i]];
    }
  }

  return argv;
}

function preProcess(args, argv) {
  var   result = [];

  var old;
  for (var i = 0; i < args.length;) {
    old = i;
    i   = arrayParam(i, result, args, argv);

    if (i === old) {
      result.push(args[i]);
      i += 1;
    }
  }

  return result;
}

function arrayParam(i, _, args, argv) {
  // const key0 = keys[i];

  // if (typeof argv[key0] !== 'string')           { return i; }

  var   m;

  if ((m = args[i].match(/--([^=]+)=$/))) {
    let key = snake_case(m[1]);
    argv[key] = [];

    for (++i; i < args.length; ++i) {
      argv[key].push(sg.smartValue(args[i]));
    }
  }

  return i;
}

