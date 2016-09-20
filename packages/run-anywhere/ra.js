
/**
 *  The main object for Run-anywhere.
 *
 *  This is the module that gets required.
 */

var sg            = require('sgsg');
var _             = sg._;

var ra = {};

exports.invoke = function(params_, spec_, fn, callback) {
  var params  = params_ || {};
  var spec    = spec_   || {};

  var args = [];

  args.push(params.params  || {});
  args.push(params.context || {});

  var cb = function(err) {
    return callback.apply(this, arguments);
  };

  args.push(cb);

  // ... other args
  if (spec.raEnv) {
    args.push(params);
  }

  // Always put the callback last
  if (_.last(args) !== cb) {
    args.push(cb);
  }

  return fn.apply(this, args);
};

ra.exportFunction = function(name, fn_, options_) {
  var fn = fn_;

  fn.raName = name;   // Cannot use 'name'

  return fn;
};

// Export the ra object.
_.each(_.keys(ra), function(key) {
  exports[key] = ra[key];
});

