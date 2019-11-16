
// TODO: I think none of these are used any more.

const sg0                       = require('sg-argv');
const sg                        = sg0.merge(sg0, require('@sg0/sg-smart-value'), require('sg-http'));
const libUrl                    = require('url');
const utils                     = require('./utils');

module.exports.argvify = argvify;

function argvify(event, context, callback =noop) {

  // req and res are on event
  const url     = libUrl.parse(event.req, true);
  const method  = url.method;
  const query   = url.query;
  const path    = url.pathname;
  const headers = normalizeHeaders(event.req.headers);

  if (!methodHasBody(method)) {
    let argv =  utils.argvify(query, /*body=*/{}, headers, /*extras=*/{}, path, method, event, context);
    callback(null, argv, context);
    return [argv, context];
  }

  return sg.getBodyJson(event.req, function(err, body) {
    const argv =  utils.argvify(query, body, headers, /*extras=*/{}, path, method, event, context);
    return callback(err, argv, context);
  });
}

function normalizeHeaders(headers) {
  return sg.reduceObj(headers, {}, function(m, v, k) {
    return [sg.smartKey(k), v];
  });
}

const bodies = ':put:post:';
function methodHasBody(method) {
  return bodies.indexOf(':'+ method.toLowerCase() +':') !== -1;
}

function noop(){}
