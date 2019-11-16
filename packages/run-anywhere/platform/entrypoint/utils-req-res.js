
exports.contextify = function(req, res, callback) {

  // TODO: build context
  var event     = {req, res};
  var context   = {};

  return callback(null, event, context);
};
