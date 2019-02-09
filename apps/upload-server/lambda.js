
exports.handler = function(event, context, callback) {
  console.log(`upload handler`, {event, context});
  return callback(null);
};
