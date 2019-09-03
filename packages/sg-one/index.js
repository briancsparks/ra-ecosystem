if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const sg                      = require('sg0');
const { _ }                   = sg;


var lib = {};

lib = sg.reduce(require('./lib/fn'), lib, (m,v,k) => {
  return sg.kv(m, k, v);
});

exports.one = lib;
