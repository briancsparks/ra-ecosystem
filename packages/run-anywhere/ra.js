
/**
 *  The main object for Run-anywhere.
 *
 *  This is the module that gets required.
 */

var sg            = require('sgsg');
var _             = sg._;
var path          = require('path');

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

ra.exportFunction = ra.raify = function(name, fn_, options_) {
  var options   = options || {};
  var fn        = fn_;

  fn.ra = {
    raified : (fn.raified = true),
    name    : (fn.raName  = name)     // Cannot use 'name'
  };

  return fn;
};

ra.routesify = function(options_, fn) {
  var toRr = function(req, res, match) {
    var rr = {req:req, res:res};
    return fn(rr, {}, function(err) {
      if (err) { return sg.nextMatch(req, res, match, err); }
    });
  };

  return toRr;
};

ra.wrap = function(lib) {

  var wrapped = {};
  _.each(lib, function(value, key) {
    var fn = value;
    if (_.isFunction(value)) {
      wrapped[key] = function(a,b,c) {
        if (arguments.length === 1 && _.isFunction(a)) { return fn.call(this, {}, {}, a); }

        return fn.apply(this, arguments);
      };
    } else {
      wrapped[key] = value;
    }
  });

  return wrapped;
};

ra.require = function(libname_, dirname) {
  var libname = dirname ? path.join(dirname, libname_) : libname_;
  var lib     = require(libname);

  return ra.wrap(lib);
};

// Export the ra object.
_.each(_.keys(ra), function(key) {
  exports[key] = ra[key];
});

