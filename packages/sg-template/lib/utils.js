
const sg                      = require('sg0');
const { _ }                   = sg;

const noop = exports.noop = function(){};

exports.std3args = function(wantFirstFnAsCb1, ...args_) {
  var   args    = _.toArray(args_);
  const options = (_.isFunction(args[0]) ? {} : args.shift());
  const cb1     = args.shift() || noop;
  const cb2     = args.shift() || noop;

  if (wantFirstFnAsCb1) {
    return [ options, cb1, cb2 ];
  }

  return [ options, cb2, cb1 ];
};

exports.dotted = function(str) {
  return str.replace(/[._-]/g, '.');
};

exports.snake = function(str) {
  return str.replace(/[._-]/g, '_');
};

exports.dashed = function(str) {
  return str.replace(/[._-]/g, '-');
};
