if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;

const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'), require('sg-http'));

// const {
//   entrypoints,
//   hosts
// }                             = ra;

module.exports.clientStartConfig = clientStartConfig;


module.exports.handle = function(argv, context, callback) {
  sg.log(`LAMBDA_Net.Dispatcher.start`, {argv, context});

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // Convert to argv -- TODO: remove once it is in ra
  // const [argv, context]      = argvify(event, context_);
  // const [argv, context]      = [event, context_];

  // TODO: Dispatch it somewhere
  // [[Fake it for now]]
  sg.log(`LAMBDA_Net::params`, {argv, context});

  // ------------------ /test

  if (context.event.path === '/test') {

    var   query = argv.__meta__.query;
    var   body  = argv.__meta__.body;
    var   data  = {argv, query, body, event: context.event};

    const _200 = sg._200({ok:true, ...data});
    sg.log(`Responding to /test request`, {_200});
    return callback(..._200);


  // ------------------ /upload

  } else if (context.event.path === '/upload') {
    sg.log(`lam`, {qn: Object.keys(quickNet)});

    return quickNet.putClientJsonToS3(argv, context, function(err, data) {
      if (err) {

        if (err.httpCode && err.httpCode === 400) {
          let _400 = sg._400({ok: false}, err);
          sg.log(`Response from app`, {_400});
          return callback(..._400);
        }

        return callback(err);
      }

      sg.log(`handler`, {data});

      const _200 = sg._200({ok:true, ...data});
      sg.log(`Response from app`, {_200});
      return callback(..._200);
    });


  // ------------------ /clientStart

  } else if (context.event.path.toLowerCase() === '/clientstart') {
    const baseResponse = clientStartConfig(argv, context);

    const _200 = sg._200({ok:true, ...baseResponse});
    return callback(..._200);
  }


  return callback(...sg._404());
};

function clientStartConfig(argv, context) {
  const baseResponse = {
    // "ok": true,
    "upstreams": {
      "telemetry": publicApiUrl('latest'),
      "attrstream": publicApiUrl('latest')
    },
    "preference": {},
    "upstream": publicApiUrl('latest')
  };

  return baseResponse;
}

function publicApiUrl(stage, apigw_id ='rtt381jli3') {
  return `https://${apigw_id}.execute-api.us-east-1.amazonaws.com/${stage}`;
}


