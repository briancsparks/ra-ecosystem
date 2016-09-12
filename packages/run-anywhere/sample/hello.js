

module.exports.hello = function(argv, context, callback) {
  return callback(null, {hello: 'world'});
};

module.exports.hello2 = function(argv, context, callback) {
  return callback(null, {hello: 'world'}, {foo: 'bar'});
};

