
var   utils                     = require('./utils');

// TODO: build argv: from query params, from the http body, etc.

module.exports.paramsFromExpress = function(req, res, callback) {
  var   argv      = {a:43};
  var   context   = utils.raContext();

  return callback(null, {argv, context});
};

