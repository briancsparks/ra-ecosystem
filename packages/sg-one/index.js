
const sg                      = require('sg0');
const { _ }                   = sg;


var lib = {};

lib = sg.reduce(require('./lib/fn'), lib, (m,v,k) => {
  return sg.kv(m, k, v);
});

exports.one = lib;
