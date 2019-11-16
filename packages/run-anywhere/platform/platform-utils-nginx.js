
const sg                        = require('sg0');
const _                         = require('lodash');
const libUrl                    = require('url');
const {decodeBodyObj,
       noop,
       normalizeHeaders,
       methodHasBody}           = require('./platform-utils');

const useSmEvents   = !!process.env.SG_LOG_SMALL_EVENTS;

module.exports.fixResponse_rpxi     = fixResponse_rpxi;

// ------------------------------------------------------------------------------------------------------------------------------
function fixResponse_rpxi(err, resp) {
  var   {httpCode =500, ...data_}   = resp  || {};
  const data                        = data_ || {ok:false};

  httpCode = sg.smartNumber(httpCode, err? 500 : 200);

  return {httpCode, ...data};
}

