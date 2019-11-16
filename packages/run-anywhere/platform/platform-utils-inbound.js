
/**
 * @file
 *
 * Utilities to help handle things as they are inbound.
 *
 *
 */
const sg0                       = require('sg-argv');
const sg                        = sg0.merge(sg0, require('@sg0/sg-smart-value'), require('sg-http'), require('sg-env'));
const {_}                       = sg;
const libUrl                    = require('url');
const platform                  = require('./platform-utils');
const awsUtils                  = require('./platform-utils-aws');
const reqResUtils               = require('./platform-utils-req-res');
const instanceUtils             = require('./platform-utils-instance');
const ARGVUtils                 = require('./platform-utils-ARGV');
const {noop,
       asErr,
       fixResponse}             = platform;


module.exports.reqRes                       = {};
module.exports.awsLambda                    = {};
module.exports.template                     = {};
module.exports.cliWorkstation               = {};
module.exports.workstation                  = {};
module.exports.cli                          = {};


module.exports.reqRes.inboundify            = reqRes_inboundify;
module.exports.awsLambda.inboundify         = awsLambda_inboundify;
module.exports.template.inboundify          = mkInboundify('template', 'template');
module.exports.cliWorkstation.inboundify    = mkInboundify('cli', 'workstation');


module.exports.reqRes.fixResponse           = fixResponse;
module.exports.awsLambda.fixResponse        = fixResponse;
module.exports.template.fixResponse         = fixResponse;
module.exports.workstation.fixResponse      = fixResponse;


module.exports.argvify                      = argvify;
module.exports.reqRes.argvify               = module.exports.argvify_reqRes         = argvify_reqRes;
module.exports.awsLambda.argvify            = module.exports.argvify_awsLambda      = argvify_awsLambda;
module.exports.template.argvify             = module.exports.argvify_template       = platform.argvify;
module.exports.cli.argvify                  = module.exports.argvify_cli            = argvify_cli;
module.exports.argvify_smart                = platform.argvify_smart;

module.exports.contextify                   = contextify;
module.exports.reqRes.contextify            = module.exports.contextify_reqRes      = contextify_reqRes;
module.exports.awsLambda.contextify         = module.exports.contextify_awsLambda   = platform.contextify_Xyz;
module.exports.template.contextify          = module.exports.contextify_template    = platform.contextify_Xyz;
module.exports.workstation.contextify       = module.exports.contextify_workstation = platform.contextify_Xyz;
module.exports.contextify_smart             = platform.contextify_smart;


module.exports.fixResponse                  = fixResponse;


// ------------------------------------------------------------------------------------------------------------------------------
function mkInboundify(epModname, hostModname) {
  const epMod     = module.exports[epModname];
  const hostMod   = module.exports[hostModname];

  return function(event, context_, callback =noop) {
    return epMod.argvify(event, context_, function(errArgvify, argv, context_) {
      return hostMod.contextify(argv, context_, function(errContextify, argv_, context) {

        return callback(asErr({errArgvify, errContextify}), argv, context);
      });
    });
  };
}

// ------------------------------------------------------------------------------------------------------------------------------
function awsLambda_inboundify(event, context_, callback =noop) {
  return argvify_awsLambda(event, context_, function(errArgvify, argv, context_) {
    return module.exports.awsLambda.contextify(argv, context_, function(errContextify, argv_, context) {

      return callback(asErr({errArgvify, errContextify}), argv, context);
    });
  });
}

// ------------------------------------------------------------------------------------------------------------------------------
function reqRes_inboundify(event, context_, callback =noop) {
  return argvify_reqRes(event, context_, function(errArgvify, argv, context_) {
    return contextify_reqRes(argv, context_, function(errContextify, argv_, context) {

      return callback(asErr({errArgvify, errContextify}), argv, context);
    });
  });
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify_awsLambda(event_, context, callback =noop) {
  return awsUtils.argvify(event_, context, callback);

  // const event     = awsUtils.normalizeEvent(event_, context);

  // const query     = sg.extend(event.queryStringParameters, multiItemItems(event.multiValueQueryStringParameters));
  // const body      = event.body;
  // const path      = event.path;
  // const method    = event.method;

  // const headers   = sg.extend(event.headers, multiItemItems(event.multiValueHeaders));

  // const extras    = {...(event.pathParameters ||{}), ...(event.stageVariables ||{})};

  // const argv      = argvify(query, body, headers, extras, path, method, event, context);

  // callback(null, argv, context);
  // return [argv, context];
}

// function multiItemItems(obj) {
//   return sg.reduce(obj, {}, (m,v,k) => {
//     if (v.length > 1) {
//       return sg.kv(m,k,v);
//     }

//     return m;
//   });
// }

// // ------------------------------------------------------------------------------------------------------------------------------
// function contextify_awsLambda(argv, context, ...rest) {
//   return contextify_Xyz(argv, context, ...rest);
// }


// // ------------------------------------------------------------------------------------------------------------------------------
// function fixResponse(resp_) {
//   if (sg.isnt(resp_))   { return resp_; }

//   var   resp = {};

//   if (sg.modes().prod) {
//     resp = _.omit(resp_, 'debug', 'dbg');
//   }

//   return resp;
// }


// ------------------------------------------------------------------------------------------------------------------------------
function argvify_cli(event, context, callback =noop) {
  return instanceUtils.argvify(event, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------------------
function argvify_reqRes(event, context, callback =noop) {
  return reqResUtils.argvify(event, context, callback);

  // // req and res are on event
  // const url     = libUrl.parse(event.req, true);
  // const method  = url.method;
  // const query   = url.query;
  // const path    = url.pathname;
  // const headers = normalizeHeaders(event.req.headers);

  // if (!methodHasBody(method)) {
  //   let argv =  argvify(query, /*body=*/{}, headers, /*extras=*/{}, path, method, event, context);
  //   callback(null, argv, context);
  //   return [argv, context];
  // }

  // return sg.getBodyJson(event.req, function(err, body_) {
  //   const event_    = reqResUtils.normalizeEvent({...event, body_}, context);
  //   const body      = event_.body || body_;

  //   const argv      =  argvify(query, body, headers, /*extras=*/{}, path, method, event_, context);
  //   return callback(err, argv, context);
  // });
}

// ------------------------------------------------------------------------------------------------------------------------------
function contextify_reqRes(argv, context, ...rest) {
  return platform.contextify_Xyz(argv, context, ...rest);
}

// // ------------------------------------------------------------------------------------------------------------------------------
// function contextify_Xyz(argv, context, ...rest) {
//   var   args      = [...rest];
//   const callback  = (_.isFunction(_.last(args)) && args.pop()) || noop;
//   const event     = args.shift();

//   return callback(null, ...contextify_smart(argv, context, event));
// }

// // ------------------------------------------------------------------------------------------------------------------------------
// function argvify_smart(event, context, argv) {
//   if (!sg.isnt(argv)) {
//     if (argv && argv.__meta__ && argv.__meta__.event) {
//       return [argv, context];
//     }

//     // We have argv, but it isnt right, fix it
//     return argvify(/*query=*/null, /*body=*/null, /*headers=*/null, /*extras=*/null, /*path=*/null, /*method=*/null, sg.or(event, argv), sg.orObj(context));
//   }

//   return argvify(/*query=*/null, /*body=*/null, /*headers=*/null, /*extras=*/null, /*path=*/null, /*method=*/null, sg.orObj(event), sg.orObj(context));
// }

// ------------------------------------------------------------------------------------------------------------------------------
function argvify(query_, body_, headers_, extras, path_, method_, event_, context) {
  return platform.argvify(query_, body_, headers_, extras, path_, method_, event_, context);

  // const event = {...(event_ ||{})};

  // const query     = query_    || {};
  // const body      = body_     || {};
  // const headers   = headers_  || {};

  // const argvs     = {...headers, ...(extras ||{}), ...body, ...query};

  // const path      = path_     || event.path     || '';
  // const method    = method_   || event.method   || '';

  // const argv = {
  //   ...argvs,
  //   __meta__: {
  //     query,
  //     body,
  //     path,
  //     method,
  //     headers,

  //     event   : event_
  //   }
  // };

  // return [argv, context ||{}];
}

// // ------------------------------------------------------------------------------------------------------------------------------
// function contextify_smart(a, context, event) {
//   if (!sg.isnt(a)) {

//     // Ideally, argvify has already been done
//     if (a && a.__meta__ && a.__meta__.event) {
//       return contextify_(a, context, event);
//     }

//     // Maybe a is {argv}
//     if (a.argv) {
//       let [argv] = argvify_smart(null, context, a.argv);
//       return contextify_(argv, context, event);
//     }

//     // Maybe a is {event}
//     if (a.event || event) {
//       let [argv] = argvify_smart(a.event || event, context);
//       return contextify_(argv, context, a.event || event);
//     }
//   }

//   let [argv] = argvify_smart(a, context);
//   return contextify_(argv, context, event);
// }

// // ------------------------------------------------------------------------------------------------------------------------------
// function contextify_(argv, context, ...rest) {
//   return [argv ||{}, contextify(argv, context, ...rest)];
// }

// ------------------------------------------------------------------------------------------------------------------------------
function contextify(argv, context, event) {
  return platform.contextify(argv, context, event);

  // return { ...context,
  //   event   : context.event || (argv && argv.__meta__ && argv.__meta__.event) || event || {},
  //   argv    : context.argv  || argv  || {}
  // };
}

// // ------------------------------------------------------------------------------------------------------------------------------
// function contextify(argv_, context) {
//   if (context.event && context.argv) {
//     return [argv, context];
//   }

//   if (!context.event) {
//     let event = (argv && argv.__meta__ && argv.__meta__.event) || {};
//     return contextify(argv, {...context, event});
//   }

//   // We must not have context.argv
//   let argv = {};
//   return contextify(argv_, {...context, argv});
// }

// // ------------------------------------------------------------------------------------------------------------------------------
// function contextify2({argv ={}, event ={}}, context_) {
//   const context   = {event, argv, ...context_};
//   return [argv, context];
// }

// // ------------------------------------------------------------------------------------------------------------------------------
// function normalizeHeaders(headers) {
//   return sg.reduceObj(headers, {}, function(m, v, k) {
//     return [sg.smartKey(k), v];
//   });
// }

// // ------------------------------------------------------------------------------------------------------------------------------
// const bodies = ':put:post:';
// function methodHasBody(method) {
//   return bodies.indexOf(':'+ method.toLowerCase() +':') !== -1;
// }

// // ------------------------------------------------------------------------------------------------------------------------------
// function noop(){}


