
const { qm, qmResolve }       = require('quick-merge');
var   sg                      = require('sg0');
const { _ }                   = sg._;

sg.config = function(...configs) {
  return qmResolve(...configs);
};

sg.configuration = function(dir, file) {
};

_.each(sg, (v,k) => {
  exports[k] = v;
});
