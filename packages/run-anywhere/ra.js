
/**
 *  The main object for Run-anywhere.
 *
 *  This is the module that gets required.
 */

var sg                        = require('sgsg');
var _                         = sg._;
var fs                        = sg.fs;
var path                      = require('path');
var urlLib                    = require('url');

var nextMatch                 = sg.routes().nextMatch;

var libRa = {};

/**
 *  Invoke a single function that adheres to the run-anywhere calling convention.
 *
 *      fn(params.params, params.context, callback);
 *
 *      - or -
 *
 *      fn(params.params, params.context, callback, spec.raEnv, callback);
 */
exports.invoke = function(params_, spec_, fn, callback) {
  var params  = params_ || {};
  var spec    = spec_   || {};

  var args = [];

  args.push(params.params  || {});
  args.push(params.context || {});

  // Wrap the callback -- we will push it up to two times:
  // 1. It is always the third parameter.
  // 2. The final parameter is always the callback.
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

/**
 *  Add meta-info to the function.
 */
libRa.exportFunction = libRa.raify = function(name, fn_, options_) {
  var options   = options || {};
  var fn        = fn_;

  fn.ra = {
    raified : (fn.raified = true),
    name    : (fn.raName  = name)     // Cannot use 'name'
  };

  return fn;
};

/**
 *  Turns an `rr` style function into one that is usable by the `routes` NPM package.
 *
 *          function(rr, context, callback) ...
 *
 *  Where `rr` will have:
 *
 *          {
 *            req     : req,              // The Node.js req param
 *            res     : res,              // The Node.js res param
 *            params  : match.params,     // The Routes match.params (url parts, like /:user/:id)
 *            splats  : match.splats,     // The Routes match.splats
 *            match   : match,            // The Routes match
 *            path    : path              // The Node.js path param from being url.parse()
 *          }
 *
 */
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

/**
 *  Wraps a function so it can be called from within its own module.
 *
 *  The intention is that you might be calling the function within your
 *  own module, or you might be calling something else altogether, like an improved version
 *  running as a Lambda module.
 *
 *  I.e. wrap all your run-anywhere style functions when you call them internally,
 *  and once deployed you can 'swap-out' the called function with something
 *  running on Lambda without updating this module.
 */
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

/**
 *  For use by ra.require(); wraps all functions from a lib.
 */
libRa.middlewareify = function(lib) {

  _.each(lib, function(origFn, origFnName) {
    if (_.isFunction(origFn)) {
      lib[origFnName] = function(a,b,c) {
        if (arguments.length === 1 && _.isFunction(a)) { return origFn.call(this, {}, {}, a); }
        if (arguments.length === 2 && _.isFunction(b)) { return origFn.call(this,  a, {}, b); }

        return origFn.apply(this, arguments);
      };
    }
  });

  return lib;
};

/**
 *  Use ra.require('lib', __dirname) to bring in run-anywhere modules.
 */
libRa.require = function(libname_, dirname) {
  var libname = dirname ? path.join(dirname, libname_) : libname_;
  var lib     = require(libname);

  return libRa.middlewareify(lib);
};

/**
 *
 */
libRa.adapt = function(a,b,c,d) {   /* (argv, context, callback1, callback) -or- (arguments, callback) */

  const callback                    = (arguments.length === 2 ? b : d);
  const [argv, context, callback1]  = (arguments.length === 2 ? a : [a,b,c]);

  var ra = {};

  ra.wrap = function(fn) {
    return function(argv, callback) {
      return fn(argv, context, callback);
    };
  };

  // Must return (below) before we call the callback
  sg.setTimeout(1, function() {
    return callback(argv, context, callback1);
  });

  return ra;
};

const safeRequire = function(name) {
  try {
    return require(name);
  } catch(e) { }

  return {};
};

/**
 *  Loads all the scripts in a dir.
 */
const loadScripts_ = function(dirname) {
  var result;

  if (!fs.test('-d', dirname))  { return result; }

  result = {};
  _.each(sg.fs.ls(dirname), (name_) => {
    const name      = path.basename(name_, '.js');
    const filename  = path.join(dirname, name);
    if (!fs.test('-f', `${filename}.js`)) { return; }   // skip
    if (name.startsWith('helper'))        { return; }   // skip helper(s).js

    result[name] = result[name] || {};
    _.extend(result[name], libRa.middlewareify(safeRequire(filename)));
  });

  return result;
};

/**
 *  Loads all the scripts from a packages ra-scripts dir.
 */
libRa.loadScripts = function(dirname) {
  var result = {mods:{}};

  const scriptDirname = path.join(dirname, 'ra-scripts');
  if (!fs.test('-d', scriptDirname))  { return /* undefined */; }

  // ----- Load scripts in the base ra-scripts dir -----
  var   raScripts = loadScripts_(scriptDirname);

  // Put fns on to results.mods[fname]
  _.extend(result.mods, raScripts);

  // Put fns on top-level.
  _.each(raScripts, (mod) => {
    _.each(mod, (fn, fname) => {
      result[fname] = fn;
    });
  });

  // ----- Load sub-dirs (except special ones) -----
  _.each(sg.fs.ls(scriptDirname), (name) => {
    const dirname  = path.join(scriptDirname, name);
    if (!fs.test('-d', dirname))      { return; }  // skip
    if (name in {models:true})        { return; }  // skip

    _.extend(result.mods, loadScripts_(dirname));
  });

  // ----- Load models in a special way -----
  const models = loadScripts_(path.join(scriptDirname, 'models')) || {};
  result.models = models;

  _.each(models, (model) => {
    _.each(model, (fn, name) => {
      if (name.match(/^(upsert|find)[A-Z]/)) {
        result.models[name] = fn;
      }
    });
  });

  return result;
};

/**
 *  Curry the context parameter.
 */
libRa.contextify = function(origFn, context_) {
  return function(argv, callback_) {
    var context   = sg.extend(context_) || {};
    var callback  = callback_;
    var callArgs  = [];

    callArgs.push(argv);
    if (arguments.length === 3) {
      _.extend(context, arguments[1]);
      callback = arguments[2];
    }
    callArgs.push(context);
    callArgs.push(callback);

    return origFn.apply(this, callArgs);
  };
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

