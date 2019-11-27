if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;

const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), quickNet.get3rdPartyLib('sg-env'), require('sg-config'), require('sg-http'));

const ENV                     = sg.ENV();

module.exports.clientStartConfig = clientStartConfig;


module.exports.handle = function(argv_, context, callback) {
  sg.log(`LAMBDA_Net.Dispatcher.start`, {argv_, context});

  // So, this is it! We are now handling the event/request. We have to dispatch it, and
  // then handle the final callback to the AWS service.

  // Dispatch it somewhere
  sg.log(`LAMBDA_Net::params`, {argv_, context});   // The ./example-request.json file was from this line

  // ------------------ /test

  if (matchRoute('/test')) {

    var   query = argv_.__meta__.query;
    var   body  = argv_.__meta__.body;
    var   data  = {argv_, query, body, event: context.event};

    const _200 = sg._200({ok:true, ...data});
    sg.log(`Responding to /test request`, {_200});
    return callback(..._200);


  // ------------------ /clientStart

  } else if (matchRoute('/clientstart')) {
    const baseResponse = clientStartConfig(argv_, context);

    const _200 = sg._200({ok:true, ...baseResponse});
    return callback(..._200);


  // ------------------ /upload
  // ------------------ /ingest

  } else {

    if (matchRoute('/upload') || matchRoute('/ingest')) {
      sg.log(`lam`, {qn: Object.keys(quickNet)});

      var Bucket, FailBucket;

      Bucket      = Bucket        || ENV.at('LAMBDANET_INGEST_BUCKET')        || 'lambda-net-ingest';
      FailBucket  = FailBucket    || ENV.at('LAMBDANET_FAIL_INGEST_BUCKET')   || 'lambda-net-ingest-fail';

      const sys_argv = {Bucket, FailBucket};
      // const argv = {...argv_, Bucket, FailBucket};
      return quickNet.putClientJsonToS3({sys_argv, ...argv_}, context, function(err, data) {

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
    }
  }


  return callback(...sg._404());


  // ==========================================================================================================================
  function matchRoute(route) {
    const path  = (argv_.path  || '').toLowerCase();
    const stage = (argv_.stage || '').toLowerCase();

    return (path === route) || (`/${stage}${path}` === route);
  }

};


// var x= {
//   "code":200,
//   "ok":true,
//   "baseRoute":"https://wazajfr8c2.execute-api.us-east-1.amazonaws.com/",
//   "upstream":"https://wazajfr8c2.execute-api.us-east-1.amazonaws.com/latest",
//   "upstreams": {
//     "upload":"https://zero.NetlabOne.net/latest",
//     "telemetry":"https://wazajfr8c2.execute-api.us-east-1.amazonaws.com/latest",
//     "attrstream":"https://wazajfr8c2.execute-api.us-east-1.amazonaws.com/latest",
//     "xapi":"https://zero.NetlabOne.net/latest"
//   }
// };


function clientStartConfig(argv, context) {
  const baseResponse = {
    // "ok": true,
    "preference": {},
    "baseRoute" : publicApiUrl(''),
    "upstream"  : publicApiUrl('latest'),
    "upstreams" : {
      "upload"      : privateApiUrl("latest", "api"),
      "telemetry"   : publicApiUrl('latest'),
      "attrstream"  : publicApiUrl('latest'),
      "xapi"        : privateApiUrl("latest", "api"),
    },
  };

  return baseResponse;
}

function publicApiUrl(stage, apigw_id ='rtt381jli3') {
  return `https://${apigw_id}.execute-api.us-east-1.amazonaws.com/${stage}`;
}

function privateApiUrl(stage, subnet ='api') {
  return `https://${subnet}.NetlabStats.net/${stage}`;
}


