if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;
const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-env'));
const {_}                     = sg;

const {handle}                = require('./lib/handlers');
const params                  = require('./lib/params');

const ENV                     = sg.ENV();

const {
  entrypoints,
  svcplatforms,
}                             = ra;
const {cleanLog}              = entrypoints;



// ----------------------------------------------------------------------------------------
// We need to export a function that AWS Lambda can call - just re-export the one from RA.
// exports.handler = entrypoints.apigateway.handler;

exports.handler = function(event, context, callback) {
  console.log(`${__filename} handling ${event.path}`);
  // console.log(`exports.handler-lambda.js`, cleanLog({event, context}));
  var result;

  const last = _.after(2, last_);

  const saveRaw = function() {
    const Body      = {...event};
    const argv      = {...event.queryStringParameters, Body};
    const sys_argv  = params.getRawBucketInfo();
    quickNet.putClientJsonToS3({sys_argv, ...argv}, context, function(err, data) {
      // Dont care about results, but the request is waiting
      console.log(`saveRaw`, sg.inspect({err, data}));
      return last();
    });
  };

  var should, did;

  should = should || ENV.at('LAMBDANET_SHOULD_RAW_UPLOAD');
  should = sg.isnt(should) ? true : should;
  if (should) {
    if (matchRoute('/upload') || matchRoute('/ingest')) {
      did = true;
      saveRaw();
    }
  }

  if (!did) {
    last();         /* Need to call last, because saveRaw did not do it. */
  }

  // Do the real processing
  return entrypoints.apigateway.handler(event, context, function(...args) {
    result = args;
    return last();
  });


  // ==========================================================================================================================
  function last_() {
    return callback(...result);
  }

  function matchRoute(route) {
    const path  = (event.path  || '').toLowerCase();
    const stage = (event.requestContext.stage || '').toLowerCase();

    return (path === route) || (`/${stage}${path}` === route);
  }
};


// -------------------------------------------------------------------------------------
// Then, RAs entrypoint calls its dispatchers, so we register a handler -- the first fn
// returns true to say that the second fn should handle the request.
entrypoints.apigateway.registerHandler(() => true, function(event, context, callback) {

  const body_length = event.body && event.body.length;
  // console.log(`Pre-svcplatforms.lambda.handler`, {event: {...event, body: body_length}, context});

  svcplatforms.lambda.handler(event, context, function(err, data, ...rest) {
    // console.log(`Post-svcplatforms.lambda.handler`, {err, data});
    callback(err, data, ...rest);
  });
});

// -------------------------------------------------------------------------------------
// Now we also have to register with RAs `host` module.
svcplatforms.lambda.setDispatcher(function(argv, context, callback) {

  // console.log(`Pre-svcplatforms.dispatcher`, {argv, context});

  return handle(argv, context, callback);
});


// if (process.env.RUN_SIDE_EFFECT_FREE_TESTS) {
//   console.log({t:process.env.RUN_SIDE_EFFECT_FREE_TESTS});
// }

const sampleEventContext = {
  "event": {
      "resource": "/{proxy+}",
      "path": "/ingest",
      "httpMethod": "PUT",
      "headers": {
          "Accept": "*/*",
          "Content-Type": "application/json",
          "Host": "rtt381jli3.execute-api.us-east-1.amazonaws.com",
          "X-Amzn-Trace-Id": "Root=1-5ddfa664-dca946767129b244c751df42",
          "X-Forwarded-For": "76.88.98.5",
          "X-Forwarded-Port": "443",
          "X-Forwarded-Proto": "https"
      },
      "multiValueHeaders": {
          "Accept": [
              "*/*"
          ],
          "Content-Type": [
              "application/json"
          ],
          "Host": [
              "rtt381jli3.execute-api.us-east-1.amazonaws.com"
          ],
          "X-Amzn-Trace-Id": [
              "Root=1-5ddfa664-dca946767129b244c751df42"
          ],
          "X-Forwarded-For": [
              "76.88.98.5"
          ],
          "X-Forwarded-Port": [
              "443"
          ],
          "X-Forwarded-Proto": [
              "https"
          ]
      },
      "queryStringParameters": {
          "sessionId": "SPARKSB3-20191128105001448",
          "ty": "attrlist",
          "upnum": "1"
      },
      "multiValueQueryStringParameters": {
          "sessionId": [
              "SPARKSB3-20191128105001448"
          ],
          "ty": [
              "attrlist"
          ],
          "upnum": [
              "1"
          ]
      },
      "pathParameters": {
          "proxy": "ingest"
      },
      "stageVariables": {
          "lambdaVersion": "latest"
      },
      "requestContext": {
          "resourceId": "jk0j91",
          "resourcePath": "/{proxy+}",
          "httpMethod": "PUT",
          "extendedRequestId": "D3bvrFVfoAMFyjA=",
          "requestTime": "28/Nov/2019:10:50:12 +0000",
          "path": "/latest/ingest",
          "accountId": "108906662218",
          "protocol": "HTTP/1.1",
          "stage": "latest",
          "domainPrefix": "rtt381jli3",
          "requestTimeEpoch": 1574938212266,
          "requestId": "e263390b-55aa-492d-813a-714c211dc876",
          "identity": {
              "cognitoIdentityPoolId": null,
              "accountId": null,
              "cognitoIdentityId": null,
              "caller": null,
              "sourceIp": "76.88.98.5",
              "principalOrgId": null,
              "accessKey": null,
              "cognitoAuthenticationType": null,
              "cognitoAuthenticationProvider": null,
              "userArn": null,
              "userAgent": null,
              "user": null
          },
          "domainName": "rtt381jli3.execute-api.us-east-1.amazonaws.com",
          "apiId": "rtt381jli3"
      },
      "body": "{\"uploadedBy\":\"SPARKSB3-20191128105001448\",\"dataType\":\"attrstream\",\"clientId\":\"SPARKSB3\",\"sessionId\":\"SPARKSB3-20191128105001448\",\"tick0\":1574938211463,\"payload\":[[{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"CID\",\"value\":\"HPIJVIPAV2\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"CLS\",\"value\":\"PRINTER\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"CMD\",\"value\":\"PCL3GUI,PCL3,PJL,JPEG,PCLM,URF,DW-PCL,802.11,802.3,DESKJET,DYN\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"DES\",\"value\":\"CN579A\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"LEDMDIS\",\"value\":\"USB#FF#CC#00,USB#07#01#02\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"MDL\",\"value\":\"Officejet Pro 8600\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"MFG\",\"value\":\"HP\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"S\",\"value\":\"038080C484201021005a00800004518005a4418001e4618001e4118005a\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"SN\",\"value\":\"CN2BQB4GX505KD\"},{\"who\":\"snmp\",\"when\":301,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"Z\",\"value\":\"0102,0500000900000100000100000100000b,0600,0700000000000000000000,0b000000000000000000009a40000000009a2f000000009a2f000000009a43,0c0,0e00000000000000000000,0f00000000000000000000,10000002000008000008000008000008,110,12000,150,17000000000000000000000000000000,181\"}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"ip\",\"value\":\"127.0.0.1\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"ipNum\",\"value\":2130706433},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"cidr\",\"value\":\"127.0.0.0\\/8\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"flags\",\"value\":\"00000015\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"hu_bcast\",\"value\":\"00000000\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"bcast\",\"value\":0},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"hu_netmask\",\"value\":\"ff000000\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"netmask\",\"value\":4278190080}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"ip\",\"value\":\"127.0.0.1\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"ipNum\",\"value\":2130706433},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"cidr\",\"value\":\"127.0.0.0\\/8\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"flags\",\"value\":\"00000015\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"hu_bcast\",\"value\":\"00000000\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"bcast\",\"value\":0},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"hu_netmask\",\"value\":\"ff000000\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"127.0.0.0/8\",\"key\":\"netmask\",\"value\":4278190080}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"ip\",\"value\":\"15.1.193.212\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"ipNum\",\"value\":251773396},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"cidr\",\"value\":\"15.1.192.0\\/22\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"flags\",\"value\":\"00000012\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"hu_netmask\",\"value\":\"fffffc00\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"15.1.192.0/22\",\"key\":\"netmask\",\"value\":4294966272}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"ip\",\"value\":\"172.28.109.97\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"ipNum\",\"value\":2887544161},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"cidr\",\"value\":\"172.28.109.96\\/28\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"flags\",\"value\":\"00000013\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"hu_netmask\",\"value\":\"fffffff0\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.28.109.96/28\",\"key\":\"netmask\",\"value\":4294967280}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"ip\",\"value\":\"10.0.75.1\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"ipNum\",\"value\":167791361},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"cidr\",\"value\":\"10.0.75.0\\/24\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"flags\",\"value\":\"00000013\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"hu_netmask\",\"value\":\"ffffff00\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"10.0.75.0/24\",\"key\":\"netmask\",\"value\":4294967040}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"ip\",\"value\":\"172.18.208.1\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"ipNum\",\"value\":2886914049},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"cidr\",\"value\":\"172.18.208.0\\/20\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"flags\",\"value\":\"00000013\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"hu_netmask\",\"value\":\"fffff000\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"172.18.208.0/20\",\"key\":\"netmask\",\"value\":4294963200}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"ip\",\"value\":\"192.168.80.1\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"ipNum\",\"value\":3232256001},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"cidr\",\"value\":\"192.168.80.0\\/24\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"flags\",\"value\":\"00000013\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"hu_netmask\",\"value\":\"ffffff00\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.80.0/24\",\"key\":\"netmask\",\"value\":4294967040}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"ip\",\"value\":\"192.168.31.1\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"ipNum\",\"value\":3232243457},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"cidr\",\"value\":\"192.168.31.0\\/24\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"flags\",\"value\":\"00000013\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"hu_netmask\",\"value\":\"ffffff00\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.31.0/24\",\"key\":\"netmask\",\"value\":4294967040}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"ip\",\"value\":\"192.168.56.1\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"ipNum\",\"value\":3232249857},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"cidr\",\"value\":\"192.168.56.0\\/24\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"flags\",\"value\":\"00000013\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"hu_netmask\",\"value\":\"ffffff00\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.56.0/24\",\"key\":\"netmask\",\"value\":4294967040}],[{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"ip\",\"value\":\"192.168.1.3\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"ipNum\",\"value\":3232235779},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"cidr\",\"value\":\"192.168.1.0\\/24\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"flags\",\"value\":\"00000013\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"hu_bcast\",\"value\":\"ffffffff\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"bcast\",\"value\":4294967295},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"hu_netmask\",\"value\":\"ffffff00\"},{\"who\":\"interface_t\",\"when\":0,\"type\":\"interface\",\"id\":\"192.168.1.0/24\",\"key\":\"netmask\",\"value\":4294967040}],[{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"188\",\"key\":\"socket\",\"value\":\"10.0.75.0\\/24__snmp\"},{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"188\",\"key\":\"iface_name\",\"value\":\"10.0.75.0\\/24\"}],[{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"208\",\"key\":\"socket\",\"value\":\"172.18.208.0\\/20__snmp\"},{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"208\",\"key\":\"iface_name\",\"value\":\"172.18.208.0\\/20\"}],[{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"212\",\"key\":\"socket\",\"value\":\"172.28.109.96\\/28__snmp\"},{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"212\",\"key\":\"iface_name\",\"value\":\"172.28.109.96\\/28\"}],[{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"136\",\"key\":\"socket\",\"value\":\"192.168.1.0\\/24__snmp\"},{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"136\",\"key\":\"iface_name\",\"value\":\"192.168.1.0\\/24\"}],[{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"124\",\"key\":\"socket\",\"value\":\"192.168.31.0\\/24__snmp\"},{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"124\",\"key\":\"iface_name\",\"value\":\"192.168.31.0\\/24\"}],[{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"128\",\"key\":\"socket\",\"value\":\"192.168.56.0\\/24__snmp\"},{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"128\",\"key\":\"iface_name\",\"value\":\"192.168.56.0\\/24\"}],[{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"132\",\"key\":\"socket\",\"value\":\"192.168.80.0\\/24__snmp\"},{\"who\":\"snmp\",\"when\":0,\"type\":\"fd\",\"id\":\"132\",\"key\":\"iface_name\",\"value\":\"192.168.80.0\\/24\"}],[{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"192\",\"key\":\"socket\",\"value\":\"10.0.75.0\\/24__snmp_blaster\"},{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"192\",\"key\":\"iface_name\",\"value\":\"10.0.75.0\\/24\"}],[{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"216\",\"key\":\"socket\",\"value\":\"172.18.208.0\\/20__snmp_blaster\"},{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"216\",\"key\":\"iface_name\",\"value\":\"172.18.208.0\\/20\"}],[{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"220\",\"key\":\"socket\",\"value\":\"172.28.109.96\\/28__snmp_blaster\"},{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"220\",\"key\":\"iface_name\",\"value\":\"172.28.109.96\\/28\"}],[{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"224\",\"key\":\"socket\",\"value\":\"192.168.1.0\\/24__snmp_blaster\"},{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"224\",\"key\":\"iface_name\",\"value\":\"192.168.1.0\\/24\"}],[{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"228\",\"key\":\"socket\",\"value\":\"192.168.31.0\\/24__snmp_blaster\"},{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"228\",\"key\":\"iface_name\",\"value\":\"192.168.31.0\\/24\"}],[{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"232\",\"key\":\"socket\",\"value\":\"192.168.56.0\\/24__snmp_blaster\"},{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"232\",\"key\":\"iface_name\",\"value\":\"192.168.56.0\\/24\"}],[{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"236\",\"key\":\"socket\",\"value\":\"192.168.80.0\\/24__snmp_blaster\"},{\"who\":\"snmp_blaster\",\"when\":0,\"type\":\"fd\",\"id\":\"236\",\"key\":\"iface_name\",\"value\":\"192.168.80.0\\/24\"}],[{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"CID\",\"value\":\"HPIJVIPAV2\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"CLS\",\"value\":\"PRINTER\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"CMD\",\"value\":\"PCL3GUI,PCL3,PJL,JPEG,PCLM,URF,DW-PCL,802.11,802.3,DESKJET,DYN\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"DES\",\"value\":\"CN579A\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"LEDMDIS\",\"value\":\"USB#FF#CC#00,USB#07#01#02\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"MDL\",\"value\":\"Officejet Pro 8600\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"MFG\",\"value\":\"HP\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"S\",\"value\":\"038080C484201021005a00800004518005a4418001e4618001e4118005a\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"SN\",\"value\":\"CN2BQB4GX505KD\"},{\"who\":\"snmp_blaster\",\"when\":434,\"type\":\"printer\",\"id\":\"192.168.1.5\",\"key\":\"Z\",\"value\":\"0102,0500000900000100000100000100000b,0600,0700000000000000000000,0b000000000000000000009a40000000009a2f000000009a2f000000009a43,0c0,0e00000000000000000000,0f00000000000000000000,10000002000008000008000008000008,110,12000,150,17000000000000000000000000000000,181\"}]]}",
      "isBase64Encoded": false
  },
  "context": {
      "callbackWaitsForEmptyEventLoop": true,
      "functionVersion": "$LATEST",
      "functionName": "lambda-net",
      "memoryLimitInMB": "256",
      "logGroupName": "/aws/lambda/lambda-net",
      "logStreamName": "2019/11/28/[$LATEST]1bc4fffc8cf14fef85b94ebd20efe47e",
      "invokedFunctionArn": "arn:aws:lambda:us-east-1:108906662218:function:lambda-net:latest",
      "awsRequestId": "6168c69c-8f3e-4c33-a885-d441fb77b2c4"
  }
};



if (require.main === module) {
  exports.handler(sampleEventContext.event, sampleEventContext.context, function(err, data) {
    console.log(`passlam`, {err, data});
  });
}
