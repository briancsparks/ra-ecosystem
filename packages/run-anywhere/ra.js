
/**
 *  The main object for Run-anywhere.
 *
 *  This is the module that gets required.
 */

var sg            = require('sgsg');
var _             = sg._;
var path          = require('path');
var urlLib        = require('url');

var nextMatch     = sg.routes().nextMatch;

var libRa = {};

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

libRa.exportFunction = libRa.raify = function(name, fn_, options_) {
  var options   = options || {};
  var fn        = fn_;

  fn.ra = {
    raified : (fn.raified = true),
    name    : (fn.raName  = name)     // Cannot use 'name'
  };

  return fn;
};

libRa.routesify = function(a, b) {
  var options, fn;
  if (arguments.length === 1) {
    options = {};
    fn      = a;
  } else {
    options = a || {};
    fn      = b;
  }

  var toRr = function(req, res, match, path_) {
    var path      = path_ || urlLib.parse(req.url).path;
    var rr        = {req:req, res:res, params:match.params, splats:match.splats, match:match, path:path};

    return fn(rr, {}, function(err, a) {
      if (err)                          { return nextMatch(req, res, match, err); }
      if (err === null && a === false)  { return nextMatch(req, res, match, err); }
    });
  };

  return toRr;
};

libRa.wrap = function(lib) {

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

libRa.middlewareify = function(lib) {

  _.each(lib, function(origFn, origFnName) {
    if (_.isFunction(origFn)) {
      lib[origFnName] = function(a,b,c) {
        if (arguments.length === 1 && _.isFunction(a)) { return origFn.call(this, {}, {}, a); }

        return origFn.apply(this, arguments);
      };
    }
  });

  return lib;
};

libRa.require = function(libname_, dirname) {
  var libname = dirname ? path.join(dirname, libname_) : libname_;
  var lib     = require(libname);

  return libRa.middlewareify(lib);
};

//------------------------------------------------------------------------------------------------
//
//    Error handling
//
//

var errorHandlers = require('./lib/error-handlers');

libRa.ErrorHandler = function(argv, context, callback) {
  var self      = this;
  var modnames  = ['console'];

  var errorMods = {}, errorModNames = [];

  self.loadErrorHandler = function(mod) {
    if (errorHandlers[mod]) {
      errorMods[mod] = new errorHandlers[mod]();
      errorModNames.push(mod);
    }
  };

  self.die = function(err, loc) {
    var i;
    for (i = 0; i < errorModNames.length; i++) {
      errorMods[errorModNames[i]].die(err, loc);
    }
    return callback(sg.toError(err));
  };

  _.each(modnames, function(modname) {
    self.loadErrorHandler(modname);
  });

};

libRa.errorHandler = function(argv, context, callback) {
  return new libRa.ErrorHandler(argv, context, callback);
};

// Export the libRa object.
_.each(libRa, function(value, key) {
  exports[key] = value;
});

