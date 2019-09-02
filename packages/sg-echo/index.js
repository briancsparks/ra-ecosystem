
const sg                      = require('sg0');
const { _ }                   = sg;

const echo = function(...args) {
  return _.map(args, function(value) {
    return value;
  });
};

exports.echo = echo;


