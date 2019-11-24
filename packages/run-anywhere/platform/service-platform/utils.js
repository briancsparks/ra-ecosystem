
// TODO: I think none of these are used any more.

const sg                        = require('sg0');
const _                         = require('lodash');

module.exports.fixResponse = fixResponse;

// ------------------------------------------------------------------------------------------------------------------------------
function fixResponse(resp_) {
  if (sg.isnt(resp_))   { return resp_; }

  var   resp = {};

  if (sg.modes().prod) {
    resp = _.omit(resp_, 'debug', 'dbg');
  }

  return resp;
}


