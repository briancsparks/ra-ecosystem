
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;
const execy                   = require('./execz').execy;
const execa                   = require('execa');
const libUrl                  = require('url');

var   lib                     = {};


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

// lib.curl = function() {
// };

lib.curl_sSL = function(...args) {
  const [curlOptions, url, query, body, callback] = crackArgs('sSL', ...args);

  return curl_(url, query, body, {}, curlOptions, {stdout:true}, callback);
};

lib._curl_ = _curl_;

// given([curlFlags], [curlFlags2], url, [query], [body], callback) -- if body is JS, query must be included
// returns [curlOptions, url, query, body, callback]
function crackArgs(...args_) {
  var   args            = _.toArray(args_);
  const callback        = args.pop();
  const curlFlags1      = (_.isString(args[0]) && _.isString(args[1])) ? args.shift() : '';
  const curlFlags2      = (_.isString(args[0]) && _.isString(args[1])) ? args.shift() : '';
  const url             = args.shift();
  const query           = (sg.isObject(args[0]) ? args.shift() : {});
  const body            = args.shift() || null;

  return [decode(curlFlags1+curlFlags2), url, query, body, callback];
}

// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//

_.each(lib, (v,k) => {
  exports[k] = v;
});

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function curl_(url_, query, body, options, curl_options, execa_options, callback) {
  const url = addQuery(url_, query);

  return _curl_(url, null, options, curl_options, execa_options, callback);
}

function _curl_(url, body, options, curl_options, execa_options_, callback) {
  var   execa_options   = _.omit(execa_options_, '');
  const isStdout        = sg.extract(execa_options, 'stdout');
  const isStderr        = sg.extract(execa_options, 'stderr');

  var   args            = mkArgs([], curl_options);

  args.push(url);

  if (isStdout) {
    return execa.stdout('curl', args, execa_options);
  }

  if (isStderr) {
    return execa.stderr('curl', args, execa_options);
  }

  return execy({show:false}, execa_options, 'curl', args, callback);
}

function addQuery(url_, query) {
  var url   = libUrl.parse(url_, true);

  url.query = sg.merge(url.query, query);
  delete url.search;

  return libUrl.format(url);
}

const lookup_ = {
  s:    's',
  S:    'S',
  L:    'L',
};

function lookup(s) {
  return lookup_[s];
}

function decode(str) {
  return sg.reduce(str, {}, (m,k) => {
    return sg.kv(m, k, lookup(k) || k);
  });
}

function mkArgs(args0, curl_options, ...rest) {
  var   args            = [];

  _.each(curl_options, (v,k) => {
    if (v === k && _.isString(v)) {
      if (v.length === 1)               { args.push(`-${v}`); }
      else                              { args.push(`--${v}`); }
    }
    else {
      args.push(`--${k}=${v}`);
    }
  });

  if (rest.length > 0) {
    return mkArgs([...args0, ...args], ...rest);
  }

  return [...args0, ...args];
}


// console.log(decode('sSLas'));
// console.log(mkArgs([], decode('sSLas'), {boo:'ya'}));
