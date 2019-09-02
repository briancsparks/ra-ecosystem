
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg0                     = require('sg0');
const { _ }                   = sg0;
const sg                      = sg0.merge(sg0, require('../sg-bits'));
const { qm }                  = require('quick-merge');

const sgDiagnostic            = require('./lib/diagnostic');
const sgCheck                 = require('./lib/check');
const sgParams                = require('./lib/params');


// -------------------------------------------------------------------------------------
//  Data
//

//
// bits mainjson:
//
// {
//   fns: {
//     lambdaDeploy: {
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
  var   self = this;

  self.context    = null;
  self.bits       = sg.bits(mod);


  self.usage = function(data ={}) {
    self.bits.setJson({fns: data});
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

    const fnSpec      = {...(mainjson.fns || {})[currFnName]};
    return fnSpec;
  };

  self.getSchema = function() {
    const currFnName  = self.getCurrFnName()    || '';
    const mainjson    = self.bits.getJson()     || {};

    const fnSpec      = {...(mainjson.fns || {})[currFnName]};
    return fnSpec;
  };

  // Hijack the mods function, returning our own
  self.async = function(xfn) {

    // Remember the passed-in fn
    const fnName        = firstFnName(xfn);
    const intercepted   = xfn[fnName];

    // Build an impostor to hand out -- this fn will be called, and needs to call the real fn
    const interceptorFn = async function(argv, context) {
      const logApi    = argv.log_api || process.env.SG_LOG_API;

      // Info about the current invocation
      var   info = {argv, context, fnName};

      var diagFunctions = sgDiagnostic.getContextItem(context, 'diagFunctions') || [];
      sgDiagnostic.setContextItem(context, 'diagFunctions', [info, ...diagFunctions]);

      self.context = context;

      // ---------- Load all data ----------
      await self.loadData(fnName);


      // ---------- Create a diag object for this invocation ----------
      var diag = sgDiagnostic.fromContext({argv, context});
      self.initDiagnostic(diag);

      diag.i_if(logApi, `--> ${fnName}:`, {argv});


      // ========== Call the intercepted function ==========
      const result = await intercepted(argv, context);


      sgDiagnostic.setContextItem(context, 'diagFunctions', diagFunctions);

      return result;
    };

    const result = {...xfn, [fnName]: interceptorFn};
    return result;
  };

  self.diagnostic = function(...args) {
    var diagFunctions     = sgDiagnostic.getContextItem(args.context || self.context, 'diagFunctions') || [];
    var {argv,context}    = sg.merge(diagFunctions[0] || {}, args[0]);

    var diag = sgDiagnostic.diagnostic({argv,context});
    return self.initDiagnostic(diag);
  };

  self.initDiagnostic = function(diag) {
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
