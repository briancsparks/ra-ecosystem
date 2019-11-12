/* eslint-disable valid-jsdoc */
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

const ENV                     = require('sg-env').ENV();



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

module.exports.DIAG = function(mod) {
  if (!(this instanceof module.exports.DIAG))     { return new module.exports.DIAG(mod); }

  var   self        = this;

  self.context      = null;
  self.bits         = sg.bits(mod);
  self.diag         = null;
  self.activeName   = null;

  self.activeName   = ENV.at('SG_DIAG_ACTIVE_FN') || self.activeName;


  self.close = function() {
    if (self.diag) {
      self.diag.close();
    }
  };

  self.usage = function(data ={}) {
    // self.bits.setJson({fns: data});   // TODO: 'fns' is one of the mis-matches with the quasi-multi-level JSON built from sg-bits
    self.bits.setJson(data);
  };

  self.activeDevelopment = function(devCliArgs) {
    // TODO: these args should not be applied unless this specific function is the one
    //       being actively developed.
    if (ENV.at('ACTIVE_DEVELOPMENT')) {
      self.bits.setData(null, {devCliArgs});
    }
  };

  self.usefulCliArgs = function(usefulCliArgs) {
    self.bits.setData(null, {usefulCliArgs});
  };

  self.isActiveName = function(name) {
    self.dg.tbd(`diagctx`, `isactivename`, '', {name, activeName: self.activeName});

    // // HACK: to maintain current behavior FIXME
    // if (self.activeName === null) {
    //   return true;
    // }

    return name === self.activeName;
  };

  self.getSetupFnName = function() {
    return self.bits.currSetupName;
  };

  self.getCurrFnName = function() {
    var diagFunctions = sgDiagnostic.getContextItem(self.context, 'diagFunctions') || [];
    return diagFunctions[0].fnName;
  };

  self.loadData = async function(fnName) {
    const mainjson    = await self.bits.loadJson()     || {};
    return mainjson;
  };



  self.devCliArgs = function(fnName) {
    if (!self.isActiveName(fnName)) {
      return '';
    }

    return self.bits.getData(fnName || self.getCurrFnName(), 'devCliArgs') || '';
  };

  self.getAliases = function() {
    const currFnName  = self.getCurrFnName()    || '';
    const mainjson    = self.bits.getJson()     || {};

    const argSpec     = ((mainjson.aliases || {})[currFnName] ||{}).args || {};   // TODO: 'fns' is one of the mis-matches with the quasi-multi-level JSON built from sg-bits
    return argSpec;
  };

  self.getSchema = function() {
    const currFnName  = self.getCurrFnName()    || '';
    const mainjson    = self.bits.getJson()     || {};

    const schema      = ((mainjson.validations || {})[currFnName] ||{}).args || {};   // TODO: maybe 'validations' is one of the mis-matches with the quasi-multi-level JSON built from sg-bits
    return schema;
  };

  self.sanityCheck = function(msg ='', obj ={}) {
    if (sg.smartValue(process.env.ACTIVE_DEVELOPMENT)) {
      if (!self.activeName) {
        // TODO: use diagnostic.w()
        console.warn(`ACTIVE_DEVELOPMENT mode, but no DIAG.activeName.
        Use SG_DIAG_ACTIVE_FN or set DIAG.activeName
          activeName: ${self.activeName}
          ${msg}` /*, util.inspect(obj, {depth: null, color:true})*/ );
      }
    }
  };

  // Hijack the mods function, returning our own

  // `xfn` is the object that gets passed to mod.xport({name: function(argv, context, callback) { ... }}) -- xfn is the object: {name: ...}
  self.async = function(xfn, isActuallyContinuationStyle) {

    // Remember the passed-in fn
    const fnName        = firstFnName(xfn);
    const intercepted   = xfn[fnName];

    // bigBanner('green', `Hijacking the overall function: ${fnName}`);

    // ---------- Create a diag object for this invocation ----------
    const setupDiag = function(argv, context, callback) {
      const logApi    = argv.log_api || process.env.SG_LOG_API;

      var diag = sgDiagnostic.fromContext({argv, context, fnName, callback});
      self.initDiagnostic(diag);

      diag.i_if(logApi, `--> ${fnName}:`, {argv});
    };

    const setupDiag2 = function(argv, context, callback) {
      const logApi    = argv.log_api || process.env.SG_LOG_API;

      var diag = sgDiagnostic.Diagnostic({argv, context, fnName, callback});
      self.initDiagnostic(diag);

      diag.i_if(logApi, `--> ${fnName}:`, {argv});

      return diag;
    };

    // Build an impostor to hand out -- this fn will be called, and needs to call the real fn
    // This is for when !isActuallyContinuationStyle
    const interceptorFnA = /*async*/ function(argv, context) {

      // If we are active development, use those args
      if (sg.smartValue(process.env.ACTIVE_DEVELOPMENT)) {
        self.sanityCheck();
        argv = sg.merge(mkArgv(self.devCliArgs(fnName)), argv ||{});
        // console.log(`invokingFnA ${fnName}`, util.inspect({argv, async: !isActuallyContinuationStyle}, {depth:null, color:true}));
      }
      // TODO: else, lookup usefulCliArgs from argv, and replace

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

      // If we are active development, use those args
      if (sg.smartValue(process.env.ACTIVE_DEVELOPMENT)) {
        let cliArgs   = self.devCliArgs(fnName);
        let cliArgs2  = mkArgv(cliArgs);
        self.sanityCheck(`Checking ACTIVE_DEVELOPMENT. fnName: |${fnName}|, devCliArgs: |${cliArgs}|`, {argv, cliArgs2});
        argv = sg.merge(cliArgs2, argv ||{});
        // console.log(`invokingFnB ${fnName}`, util.inspect({argv, async: !isActuallyContinuationStyle}, {depth:null, color:true}));
      }

      if (argv.useful) {
        // TODO: else, lookup usefulCliArgs from argv, and replace
        const usefulCliArgs   = self.bits.getData(fnName || self.getCurrFnName(), 'usefulCliArgs');
        const cliArgs         = mkArgv(usefulCliArgs[argv.useful]);
        argv                  = sg.merge(cliArgs ||{}, argv ||{});
      }

      setupDiag(argv, context, callback);

      return interceptCaller(argv, context, async function(callbackCCC) {

        // ---------- Load all data ----------
        await self.loadData(fnName);

        // ========== Call the intercepted function ==========
        return intercepted(argv, context, function(err, result) {

          return callbackCCC(function callbackDDD() {
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
  self.diagnostic = function({argv,context,callback}, fnName) {

    var diagFunctions         = sgDiagnostic.getContextItem(context || self.context, 'diagFunctions') || [];
    fnName                    = fnName || diagFunctions.fnName;
    // var {fnName}                = sg.merge(diagFunctions[0] || {}, {argv,context});

    var diag = sgDiagnostic.diagnostic({argv, context, fnName, callback});
    return self.initDiagnostic(diag);
  };

  self.initDiagnostic = function(diag) {
    self.diag     = diag;
    diag.DIAG     = self;
    diag.bits     = self.bits;

    return diag;
  };

  self.dg = new sgDiagnostic.Diagnostic();
};

// module.exports.DIAG = function(...args) {
//   return new module.exports.DIAG_(...args);
// };


// -------------------------------------------------------------------------------------
// exports
//

module.exports.Diagnostic = sgDiagnostic.Diagnostic;
module.exports.diagnostic = sgDiagnostic.diagnostic;
module.exports.cleanContext = sgDiagnostic.cleanContext;

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
  if (sg.isnt(cliString))     { return cliString; }

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
