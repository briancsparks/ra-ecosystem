
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

  self.usages     = {};
  self.config     = {};
  // self.xfns       = {};
  self.context    = null;
  self.bits       = sg.bits(mod);

  var   modFilename = mod.filename;
  var   modDirname  = mod.path;

  self.usage = function(options ={}) {
    self.usages = _.extend({}, self.usages, options);
    self.config = qm(self.config, {fns:options});
  };

  self.getCurrFnName = function() {
    var diagFunctions = sgDiagnostic.getContextItem(self.context, 'diagFunctions') || [];
    return diagFunctions[0].fnName;

    // var currFnNames = sgDiagnostic.getContextItem(self.context, 'currFnNames') || [];
    // return currFnNames[0];
  };

  self.getJson = function() {
    return self.bits.getJson();
  };

  self.getFnSpec = function(fnName) {
    const currFnName  = self.getCurrFnName()          || fnName   || '';
    const mainjson    = self.getJson()                || {};

    // const usage       = {...(self.usages || {})[currFnName], ...(mainjson.fns || {})[currFnName]};
    // const usage       = {...(self.config.fns || {})[currFnName]};
    const usage       = {...(self.usages || {})[currFnName]};

    return usage;
  };

  // Hijack the mods function, returning our own
  self.async = function(xfn) {
    // Remember the passed-in fn
    const fnName        = firstFnName(xfn);
    const intercepted   = xfn[fnName];
    // self.xfns[fnName]   = intercepted;

    // Build an impostor to hand out -- this fn will be called, and needs to call the real fn
    const interceptorFn = async function(argv, context) {

      // Info about the current invocation
      var   info = {argv, context, fnName};

      var diagFunctions = sgDiagnostic.getContextItem(context, 'diagFunctions') || [];
      sgDiagnostic.setContextItem(context, 'diagFunctions', [info, ...diagFunctions]);

      // var currFnNames = sgDiagnostic.getContextItem(context, 'currFnNames') || [];
      // sgDiagnostic.setContextItem(context, 'currFnNames', [fnName, ...currFnNames]);

      self.context = context;

      var diag = sgDiagnostic.fromContext({argv, context});
      self.initDiagnostic(diag);


      // ========== Call the intercepted function ==========
      const result = await intercepted(argv, context);


      // TODO: any cleanup
      // sgDiagnostic.setContextItem(context, 'currFnNames', currFnNames);
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
