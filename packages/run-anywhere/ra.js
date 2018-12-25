
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
const difflet                 = require('difflet');
const runAnywhereV2           = require('./lib/rav2');

var nextMatch                 = sg.routes().nextMatch;

var libRa = {v2:runAnywhereV2};

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
 *  Injects RA between the caller and your function.
 *
 *  Call this at the very top of the function, which gives ra the context object.
 *  You get back an ra object that you should use to wrap any other ra functions,
 *  so that the proper context gets used.
 *
 *  ```
 *    lib.foo = function() {
 *      const ra = raLib.adapt(arguments, function(argv, context, callback) {
 *        const setSomething = ra.wrap(lib.setSomething);
 *
 *        // ...
 *
 *        // At this point, setSomething is called correctly, given the context
 *        setSomething(params, function(err, result) {
 *          // ...
 *        });
 *      });
 *    };
 *  ```
 *
 */
libRa.adapt = function(a,b,c,d) {   /* (argv, context, callback1, callback) -or- (arguments, callback) */

  const callback                    = (arguments.length === 2 ? b : d);
  const [argv, context, callback1]  = (arguments.length === 2 ? a : [a,b,c]);

  var ra = {};

  ra.wrap = function(fn, sendErrorAlong_) {
    var sendErrorAlong = sendErrorAlong_;

    return function(argv, b, c) {                 // (argv, sendErrorAlong__, callback)
      var callback, msg = '';

      if (arguments.length === 3) {
        callback        = c;
        sendErrorAlong  = b;
      } else {
        callback        = b;
      }

      if (typeof sendErrorAlong === 'string') {
        msg             = sendErrorAlong;
        sendErrorAlong  = false;
      }

      if (sendErrorAlong) {
        return fn(argv, context, callback);
      }

      return fn(argv, context, function(err) {
        if (err)  { return sg.die(err, callback, `Error processing ${msg}`); }

        return callback.apply(this, arguments);
      });
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
libRa.contextify = function(origFn, context__) {
  var context_ = {};

  if (!(context__.req && context__.res)) {
    context_ = context__;
  }

  return function(argv, callback_) {
    var context   = sg._extend(context_) || {};
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

/**
 *  An ra-ified function that needs a DB or redis should use this to bootstrap.
 *
 *  It manages the lifetime of a short-lived connection, or gets out of the way
 *  if the caller to the ra-ified function provided the DB/redis connection.
 */
libRa.bootServices = function(fname, options_, argv, context, outerCb, callback) {
  const options     = servicesOptions(options_);
  const needDb      = options.db;
  const needRedis   = options.redis;
  const givenDb     = needDb    && sg.extract(argv, 'db')     || context.db;
  const givenRedis  = needRedis && sg.extract(argv, 'redis')  || context.redis;
  const canDie      = sg.extract(argv, 'canDie') || options.canDie || !givenDb;
  const namespace   = sg.argvGet(argv, 'namespace,ns') || options.namespace || process.env.NAMESPACE || 'layer67';
  const abort       = sg.extract(argv, 'abort') || options.abort || myAbort;
  var   db          = givenDb;
  var   redis       = givenRedis;
  var   config      = {};

  var   MongoClient, redisLib;

  return sg.__run([function(next) {
    if (db || !needDb) { return next(); }

    const dbAddress   = process.env.LAYER67_DB_IP || options.dbIp  || 'db';
    var   dbUrl       = 'mongodb://'+dbAddress+':27017/'+namespace;

    return MongoClient.connect(dbUrl, function(err, db_) {
      if (!sg.ok(err, db_)) { return abort === myAbort ? abort(err, 'MongoClient_connect') : abort(); }

      db = db_;
      return next();
    });

  }, function(next) {
    if (redis || !needRedis) { return next(); }

    const redisHost = process.env.LAYER67_UTIL_IP || options.redisIp || 'redis';
    const redisPort = 6379;

    redisLib  = require('redis');
    redis     = redisLib.createClient(redisPort, redisHost);

    return next();
  }], function done() {

    config.db       = db;
    config.redis    = redis;

    return sg.iwrap(fname, outerCb, abort, function(eabort) {
      return callback(null, config, eabort, abort);
    });
  });

  function myAbort(err, msg) {
    if (!givenDb && db) {
      db.close();
    }

    if (!givenRedis && redis) {
      redis.quit();
    }

    if (msg) {
      if (canDie) { return sg.die(err, outerCb, msg); }

      console.error(msg, err);
    }

    return outerCb(err);
  }
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

exports.Validator = function(context) {
  var   errors = 0;
  const assert = require('assert');

  const self = this;

  self.runner = function(fns, callback) {
    return sg.__runll(fns, function() {
      if (errors) {
        return callback(''+errors+' Errors.');
      }
      return callback();
    });
  };

  self.compare  = function(fn, argv, shouldBe, callback) {
    return fn(argv, context, function(err, data) {

      if (err) {
        errors++;
      }

      if (!sg.deepEqual(data, shouldBe)) {
        const d = difflet.compare(shouldBe, data);
        process.stderr.write(d);
        errors++;
      }
      return callback();
    });
  };
};

function servicesOptions(options) {
  if (_.isString(options)) {
    return sg.keyMirror(options);
  }

  return options || {};
}


