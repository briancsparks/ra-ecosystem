
const sg    = require('.');

var args_ = `cmd --multi-seg-opt=55 --flag --opt=val --arr= one two 3 --json={\"a\":42} --json2={'foo':'bar'} --bad- --no-op2 --re=/^[a-z]+/ --date=2019-11-25T04:07:23.314Z --package=@package.json --license=@LICENSE`;

// sg.ARGVnormal     = ARGVnormal;       // Most normal: no logging fns, all spellings of keys, no favors
// sg.ARGV3          = ARGV3;            // Most normal (ARGVnormal), but easier to use name   ******* use this one *******
// sg.ARGVplain      = ARGVplain;        // ARGV, no favors, no logging fns, just camelCase keys (most JS will expect camelCase)
// sg.ARGVpod        = ARGVpod;          // Simpliest: no favors, just the data, but will all spelling variations
// sg.ARGVasIs       = ARGVasIs;         // Basic: no nothing
// sg.ARGVsnakeCase  = ARGVsnakeCase;    // Simple. Uses snake_case only

//-----------------------------------------------------------------------------------------------------------------------------
if (require.main === module) {
  var ARGV, argvArr, _1, _2;

  // [ARGV, _1, _2, ...argvArr] = type();
  [ARGV, ...argvArr] = type();

  if (argvArr && argvArr.length >= 3) {
    ARGV    = ARGV({}, argvArr);
  } else {
    var args  = `${args_}`;
    var cli   = `${args}`;
    console.log(`\nConsider: \n\n  node see ${cli}\n`);

    ARGV    = ARGV({}, `node see ${cli}`.split(' '));
  }

  var   small =[], medium =[], large =[];

  const keys = Object.keys(ARGV);
  for (let i = 0; i < keys.length; ++i) {
    const key  = keys[i];
    var   item = ARGV[key];

    if (typeof item === 'function') {
      continue;
    }

    var ty, str;
    [ty, str, item] = mkString(item);

    if (str.length < 40)            { small.push( [key, ty, str, item]); }
    else if (str.length < 80)       { medium.push([key, ty, str, item]); }
    else                            { large.push( [key, ty, str, item]); }

  }

  // Calculate width of columns
  var maxlen = [0,0,0];
  sg._.each([small, medium, large], function(itemList) {
    sg._.each(itemList, function(item) {
      maxlen[0] = Math.max(maxlen[0], item[0].length);
      maxlen[1] = Math.max(maxlen[1], item[1].length);
    });
  });

  // Show the short ones
  sg._.each([small, medium], function(itemList) {
    maxlen[2] = 0;
    sg._.each(itemList, function(item) {
      maxlen[2] = Math.max(maxlen[2], item[2].length);
    });

    sg._.each(itemList, function(item) {
      console.log(pad(item[0], maxlen[0] +4), pad(item[1], maxlen[1] +4), pad(item[2], maxlen[2] +4));
    });

    console.log("");
  });

  // Show the long one, truncated
  sg._.each([large], function(itemList) {
    maxlen[2] = 0;
    sg._.each(itemList, function(item) {
      maxlen[2] = Math.max(maxlen[2], item[2].length);
    });

    sg._.each(itemList, function(item) {
      console.log(pad(item[0], maxlen[0] +4), pad(item[1], maxlen[1] +4), item[2].replace(/[\r\n]+/g, '\\n').substr(0, 80)+'...');
    });

    console.log("");
  });

}

//-----------------------------------------------------------------------------------------------------------------------------
function type() {
  const [_1, _2, first, ...rest] = process.argv;

  if (first) {
    switch(first.toLowerCase()) {
      case 'normal'     :  return [sg.ARGVnormal, _1, _2, ...rest];
      case '3'          :  return [sg.ARGV3, _1, _2, ...rest];
      case 'plain'      :  return [sg.ARGVplain, _1, _2, ...rest];
      case 'pod'        :  return [sg.ARGVpod, _1, _2, ...rest];
      case 'asis'       :  return [sg.ARGVasIs, _1, _2, ...rest];
      case 'snake'      :  return [sg.ARGVsnakeCase, _1, _2, ...rest];
      case 'snakecase'  :  return [sg.ARGVsnakeCase, _1, _2, ...rest];
    }
  }

  return [sg.ARGV, ...process.argv];
}

//-----------------------------------------------------------------------------------------------------------------------------
function mkString(x) {

  if (typeof x === 'string')    { return [typeof x, `"${x}"`, x]; }
  if (Array.isArray(x))         { return ['Array',  sg.safeJSONStringify(x,null,null), x]; }
  if (x instanceof RegExp)      { return ['RegExp', ''+x, x]; }
  if (x instanceof Date)        { return ['Date',   ''+x, x]; }
  if (sg.isObject(x))           { return [typeof x, sg.safeJSONStringify(x,null,null), x]; }

  return [typeof x, ''+x, x];
}

//-----------------------------------------------------------------------------------------------------------------------------
function pad(s_, len, fill =' ') {
  var s = ''+s_;
  while (s.length < len) {
    s = fill + s;
  }
  return s;
}
