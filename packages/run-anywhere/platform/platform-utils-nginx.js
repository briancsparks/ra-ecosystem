
const sg                        = require('sg0');
const _                         = require('lodash');
const libUrl                    = require('url');
const {decodeBodyObj,
       noop,
       normalizeHeaders,
       methodHasBody}           = require('./platform-utils');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.fixResponse_rpxi     = fixResponse_rpxi;

function fixResponse_rpxi(err, resp) {
  var   {httpCode =500, ...data_}   = resp  || {};
  const data                        = data_ || {ok:false};

  httpCode = sg.smartNumber(httpCode, err? 500 : 200);

  return {httpCode, ...data};

//   // Do we have a response?
//   if (!resp) {
//     sg.elog(`ENORESP: No response`);

//     // Have to return something
//     return {
//       statusCode        : 500,
//       body              : sg.safeJSONStringify({error: 'server'}),
//       isBase64Encoded   : false
//     };
//   }

//   // Maybe the response is already in the right format
//   if ('statusCode' in resp && typeof resp.body === 'string' && 'isBase64Encoded' in resp) {
//     return resp;
//   }

//   // NOTE: You can also have "headers" : {}

//   return {
//     statusCode        : resp.statusCode ||  resp.httpCode || (resp.ok === true ? 200 : 404),
//     body              : sg.safeJSONStringify(resp),
//     isBase64Encoded   : false
//   };
}

