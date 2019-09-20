if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg0                     = require('sg0');
const { _ }                   = sg0;
const sg                      = sg0.merge(sg0, require('sg-bits'));
const { qm }                  = require('quick-merge');
const util                    = require('util');
const banner                  = require('./lib/banner');

const sgDiagnostic            = require('./lib/diagnostic');
const sgCheck                 = require('./lib/check');
const sgParams                = require('./lib/params');
const { bigBanner }           = banner;



// -------------------------------------------------------------------------------------
//  Data
//

//
// bits mainjson:
//
// {
//   fns: {
//     deployLambda: {
//       args: {
//         lambdaName:       {aliases: 'name,lambda_name'},
//         class_b:          {aliases: 'classB,b'},
//         AWS_PROFILE:      {aliases: 'aws_profile,profile'},
//       },
//       validations: {
//         argv: {
//           ... JSON schema
//         }
//       }
//     }
//   }
// }
//

// -------------------------------------------------------------------------------------
//  Functions
//

module.exports.DIAG_ = function(mod) {
  var   self        = this;

  self.context      = null;
  self.bits         = sg.bits(mod);
  self.diag         = null;

  self.devCliArgs   = null;


  self.close = function() {
    if (self.diag) {
      self.diag.close();
    }
  };

  self.usage = function(data ={}) {
    // self.bits.setJson({fns: data});   // TODO: 'fns' is one of the mis-matches with the quasi-multi-level JSON built from sg-bits
    self.bits.setJson(data);
  };

  self.activeDevelopment = function(cliArgs) {
    self.devCliArgs = (self.devCliArgs || '') + ' ' + cliArgs;
  };

  self.loadData = async function(fnName) {
    const mainjson    = await self.bits.loadJson()     || {};
    return mainjson;
  };

  self.getCurrFnName = function() {
    var diagFunctions = sgDiagnostic.getContextItem(self.context, 'diagFunctions') || [];
    return diagFunctions[0].fnName;
  };

  self.getAliases = function() {
    const currFnName  = self.getCurrFnName()    || '';
    const mainjson    = self.bits.getJson()     || {};

    // const argSpec      = ((mainjson.aliases || mainjson.fns || {})[currFnName] ||{}).args || {};   // TODO: 'fns' is one of the mis-matches with the quasi-multi-level JSON built from sg-bits
    const argSpec      = ((mainjson.aliases || {})[currFnName] ||{}).args || {};   // TODO: 'fns' is one of the mis-matches with the quasi-multi-level JSON built from sg-bits
    return argSpec;
  };

  self.getSchema = function() {
    const currFnName  = self.getCurrFnName()    || '';
    const mainjson    = self.bits.getJson()     || {};

    const schema      = ((mainjson.validations || {})[currFnName] ||{}).args || {};   // TODO: maybe 'validations' is one of the mis-matches with the quasi-multi-level JSON built from sg-bits
    return schema;
  };

  // Hijack the mods function, returning our own

  // `xfn` is the object that gets passed to mod.xport({name: function(argv, context, callback) { ... }}) -- xfn is the object: {name: ...}
  self.async = function(xfn, isActuallyContinuationStyle) {

    // Remember the passed-in fn
    const fnName        = firstFnName(xfn);
    const intercepted   = xfn[fnName];

    bigBanner('green', `Hijacking the overall function: ${fnName}`);

    const setupDiag = function(argv, context, callback) {
      const logApi    = argv.log_api || process.env.SG_LOG_API;

sg.log(`setupDiag`, {argv, context: !!context, callback: typeof callback});

      // ---------- Create a diag object for this invocation ----------
      var diag = sgDiagnostic.fromContext({argv, context, fnName, callback});
sg.log(`setupDiag2-back`, {argv, context: !!context, callback: typeof callback});
      self.initDiagnostic(diag);
sg.log(`setupDiag3-back`, {argv, context: !!context, callback: typeof callback});

      diag.i_if(logApi, `--> ${fnName}:`, {argv});
sg.log(`setupDiag4-back`, {argv, context: !!context, callback: typeof callback});
    };

    // Build an impostor to hand out -- this fn will be called, and needs to call the real fn
    // This is for when !isActuallyContinuationStyle
    const interceptorFnA = /*async*/ function(argv, context) {
sg.log(`interceptorA`, {devCliArgs: self.devCliArgs});

      // If we are active development, use those args
      if (process.env.ACTIVE_DEVELOPMENT && self.devCliArgs) {
        argv = sg.merge(argv ||{}, mkArgv(self.devCliArgs));
        console.log(`invokingFnA ${fnName}`, util.inspect({argv, async: !isActuallyContinuationStyle}, {depth:null, color:true}));
      }

      setupDiag(argv, context, null);

      return new Promise(async (resolve, reject) => {

        return interceptCaller(argv, context, async function(callbackCCC) {

          // ---------- Load all data ----------
          const mainJson = await self.loadData(fnName);

          // ========== Call the intercepted function ==========
          const result = await intercepted(argv, context);

          return callbackCCC(function callbackDDD() {
            return resolve(result);
          });
        });
      });
    };


    // This is for when isActuallyContinuationStyle
    const interceptorFnB = function(argv, context, callback) {
sg.log(`interceptorB`, {devCliArgs: self.devCliArgs, argv, context: !!context, callback: typeof callback});

      // If we are active development, use those args
      if (process.env.ACTIVE_DEVELOPMENT && self.devCliArgs) {
        argv = sg.merge(argv ||{}, mkArgv(self.devCliArgs));
        console.log(`invokingFnB ${fnName}`, util.inspect({argv, async: !isActuallyContinuationStyle}, {depth:null, color:true}));
      }

sg.log(`interceptorB2`, {devCliArgs: self.devCliArgs, argv, context: !!context, callback: typeof callback});
      setupDiag(argv, context, callback);
sg.log(`interceptorB7`, {devCliArgs: self.devCliArgs, argv});

      return interceptCaller(argv, context, async function(callbackCCC) {
sg.log(`interceptorB3`, {devCliArgs: self.devCliArgs, argv});

        // ---------- Load all data ----------
        await self.loadData(fnName);
sg.log(`interceptorB4`, {devCliArgs: self.devCliArgs, argv, fnName});

        // ========== Call the intercepted function ==========
        return intercepted(argv, context, function(err, result) {
sg.log(`interceptorB5-back from intercepted`, {argv, err, result});

          return callbackCCC(function callbackDDD() {
sg.log(`interceptorB6 final`, {argv, err, result});
            return callback(err, result);
          });
        });
      });
    };


    const interceptorFn = isActuallyContinuationStyle ? interceptorFnB : interceptorFnA;

    return {...xfn, [fnName]: interceptorFn};



    // ====================================================================================
    function interceptCaller(argv, context, continuation) {

      // Info about the current invocation
      var   info = {argv, context, fnName};

      var diagFunctions = sgDiagnostic.getContextItem(context, 'diagFunctions') || [];
      sgDiagnostic.setContextItem(context, 'diagFunctions', [info, ...diagFunctions]);

      self.context = context;

      return continuation(function callbackCCC(callbackDDD) {

        // ---------- Clean up ----------
        sgDiagnostic.setContextItem(context, 'diagFunctions', diagFunctions);

        // Close things if this is just a one-time run
        if (fnName === (context.runAnywhere ||{}).invokedFnName || '') {
          self.close();
        }

        return callbackDDD();
      });

    }
  };

  self.xport = function(xfn) {
    return self.async(xfn, true);
  };

  /**
   * This is the function that other functions call when they start.
   *
   * @param {Array} args - The typical {argv, context}
   * @returns {Object} The new Diagnostic object.
   */
  self.diagnostic = function(args) {
    var diagFunctions           = sgDiagnostic.getContextItem(args.context || self.context, 'diagFunctions') || [];
    var {argv,context,fnName}   = sg.merge(diagFunctions[0] || {}, args);

    var diag = sgDiagnostic.diagnostic(args);
    return self.initDiagnostic(diag);
  };

  self.initDiagnostic = function(diag) {
    self.diag = diag;
    diag.DIAG = self;
    diag.bits = self.bits;
    return diag;
  };

};

module.exports.DIAG = function(...args) {
  return new module.exports.DIAG_(...args);
};


// -------------------------------------------------------------------------------------
// exports
//

module.exports.Diagnostic = sgDiagnostic.Diagnostic;
module.exports.diagnostic = sgDiagnostic.diagnostic;

_.each(sgCheck,  xport_it);
_.each(sgParams, xport_it);
_.each(banner,   xport_it);

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function xport_it(v,k) {
  module.exports[k] = v;
}

function firstFnName(xfn) {
  return sg.reduce(xfn, null, (m, fn, name) => {
    if (_.isFunction(fn)) {
      m = m || name;
    }
    return m;
  });
}


function to_snake_case(key) {
  return key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function toCamelCase(key) {
  var parts = key.split(/[^a-zA-Z0-9]/);
  var first = parts.shift();
  return sg.reduce(parts, first, (s, part) => {
    return s + sg.toUpperWord(part);
  });
}

function mkArgv(cliString) {
  const cliArgs   = cliString.split(/\s+/gi);
  var   argv      = require('minimist')(cliArgs);

  var key;
  return sg.reduce(Object.keys(argv), argv, (m,k) => {
    if (k === '_') {
      return m;
    }

    key = to_snake_case(k);
    if (!(key in m)) {
      m[key] = argv[k];
    }

    key = toCamelCase(k);
    if (!(key in m)) {
      m[key] = argv[k];
    }

    return m;
  });

}
