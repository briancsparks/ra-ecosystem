
var _ = require('underscore');

module.exports.hello = function(argv, context, callback) {
  return callback(null, {hello: 'world'});
};

module.exports.hello2 = function(argv, context, callback) {
  return callback(null, {hello: 'world'}, {foo: 'bar'});
};

exports.echo = function(argv, context, callback) {
  // ...

  var result = _.extend({hello: "world"}, argv);
  return callback(null, result);
};

