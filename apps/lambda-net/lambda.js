if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;

const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'), require('sg-http'));
const util                    = require('util');
const { _ }                   = sg;

const S3                      = require('./lib/s3');
// const { awsService }          = quickNet.libAws;

const {
  entrypoints,
  hosts
}                             = ra;

// -------------------------------------------------------------------------------------
//  Data
//

// -------------------------------------------------------------------------------------
//  Functions
//


// -------------------------------------------------------------------------------------
// We need to export a function that AWS Lambda can call.
//
// The easiest thing to do is just to get the 'entrypoint' one from RA, and export it.
exports.handler = entrypoints.aws_lambda.platform_entrypoint_lambda_handler;

// However, you could handle the function call and call RAs entrypoint.
// exports.handler = function(event, context, callback) {
//   entrypoints.aws_lambda.platform_entrypoint_lambda_handler(event, context, callback);
// };

// -------------------------------------------------------------------------------------
// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoints.aws_lambda.registerHandler(() => true, hosts.aws_lambda.platform_host_lambda_handler);

// -------------------------------------------------------------------------------------
// Now we also have to register with RAs `host` module.
hosts.aws_lambda.setDispatcher(function(event, context_, callback) {
  sg.log(`LAMBDA_Net.Dispatcher.start`, {event, context:context_});

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // Convert to argv -- TODO: remove once it is in ra
  // const [argv, context]      = argvify(event, context_);
  const [argv, context]      = [event, context_];

  // TODO: Dispatch it somewhere
  // [[Fake it for now]]
  sg.log(`LAMBDA_Net::params`, {argv, context});

  if (context.event.path === '/test') {

    var   query = argv.__meta__.query;
    var   body  = argv.__meta__.body;
    var   data  = {argv, query, body, event: context.event};

    const _200 = sg._200({ok:true, ...data});
    sg.log(`Responding to /test request`, {_200});
    return callback(...fixResponseForApiGatewayLambdaProxy(..._200));

  } else if (context.event.path === '/upload') {
    sg.log(`lam`, {qn: Object.keys(quickNet)});

    return quickNet.putToS3(argv, context, function(err, data) {
      if (err) {

        if (err.httpCode && err.httpCode === 400) {
          let _400 = sg._400({ok: false}, err);
          sg.log(`Response from app`, {_400});
          return callback(...fixResponseForApiGatewayLambdaProxy(..._400));
        }

        return callback(err);
      }

      sg.log(`handler`, {data});

      const _200 = sg._200({ok:true, ...data});
      sg.log(`Response from app`, {_200});
      return callback(...fixResponseForApiGatewayLambdaProxy(..._200));
    });
  }

  return callback(...sg._404());

  // return S3.putToS3(argv, context, function(err, data) {
  //   if (err) {

  //     if (err.httpCode && err.httpCode === 400) {
  //       let _400 = sg._400({ok: false}, err);
  //       sg.log(`Response from app`, {_400});
  //       return callback(...fixResponseForApiGatewayLambdaProxy(..._400));
  //     }

  //     return callback(err);
  //   }

  //   sg.log(`handler`, {data});

  //   const _200 = sg._200({ok:true, ...data});
  //   sg.log(`Response from app`, {_200});
  //   return callback(...fixResponseForApiGatewayLambdaProxy(..._200));
  // });
});

function fixResponseForApiGatewayLambdaProxy(err, resp) {

  // NOTE: You can also have "headers" : {}

  return [ err, {
    statusCode        : resp.statusCode ||  resp.httpCode || (resp.ok === true ? 200 : 404),
    body              : JSON.stringify(resp),
    isBase64Encoded   : false
  }];
}

// function argvify(event_, context_) {

//   // Already been done?
//   if (event_.__meta__) {
//     return [event_, context_];
//   }

//   const event = {...event_};

//   const query     = sg.extend(event.queryStringParameters, multiItemItems(event.multiValueQueryStringParameters));
//   const body      = decodeBody(event);

//   const headers   = sg.extend(event.headers, multiItemItems(event.multiValueHeaders));

//   const argvs     = {...headers, ...(event.pathParameters ||{}), ...(event.stageVariables ||{}), ...body, ...query};

//   const context   = {...context_, event: event_};

//   const argv = {
//     ...argvs,
//     __meta__: {
//       query,
//       body,
//       path    : event.path,
//       method  : event.method,

//       event   : event_
//     }
//   };


//   return [argv,context];
// }

// function multiItemItems(obj) {
//   return sg.reduce(obj, {}, (m,v,k) => {
//     if (v.length > 1) {
//       return sg.kv(m,k,v);
//     }

//     return m;
//   });
// }

// function decodeBody(event) {
//   const {body, isBase64Encoded} = event;

//   if (sg.isnt(body))        { return body; }
//   if (!_.isString(body))    { return body; }    /* already parsed */

//   var body_ = body;

//   if (isBase64Encoded) {
//     const buf   = new Buffer(body, 'base64');
//     body_       = buf.toString('ascii');
//   }

//   body_ = sg.safeJSONParse(body_)   || {payload:[]};

//   // Make much smaller sometimes
//   if (sg.modes().debug) {
//     if (Array.isArray(body_.payload) && body_.payload.length > 1) {
//       body_ = {...body_, payload: [body_.payload[0], `${body_.payload.length} more items.`]};
//     }
//   }

//   event.body              = body_;
//   event.isBase64Encoded   = false;

//   return body_;
// }

// -------------------------------------------------------------------------------------
// This is a function to enable smoke testing.
// exports.handler({}, {}, function(err, data) {
//   console.log(`Returned to original caller, err: ${err}`, data);
// });


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//



