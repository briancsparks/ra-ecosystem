if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * Uses RA Express server (not in Lambda, though) to (1) reverse-proxy, and (2) use redis
 * to do `notifyData`.
 *
 */

// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg;
const proxy                   = require('http-proxy-middleware');
const quickNet                = require('.');
const express                 = ra.get3rdPartyLib('express');
// const libRedis                = ra.get3rdPartyLib('redis');
const router                  = express.Router();
const {
  getReqParams, _200, _400, _500
}                             = quickNet.libHttp;

const mod                     = ra.modSquad(module, 'quickNetExpress');

const ARGV                    = sg.ARGV();

var   lib                     = {};
var   redis;


// -------------------------------------------------------------------------------------
//  Data
//

const namespace               = process.env.NAMESPACE || process.env.NS || 'quicknet';
const NAMESPACE               = namespace.toUpperCase();
const redisPort               = 6379;
const redisHost               = 'redis';

const collNames               = (process.env[`${NAMESPACE}_COLLECTIONS`] || 'users').split(',');
const dbName                  = process.env[`${NAMESPACE}_DB_NAME`]      || 'quicknet';
const binaryMimeTypes = [
	'application/octet-stream',
	'font/eot',
	'font/opentype',
	'font/otf',
	'image/jpeg',
	'image/png',
	'image/svg+xml'
];

const PRIVATE_APIKEY          = process.env[`${NAMESPACE}_PRIVATE_APIKEY`];


// -------------------------------------------------------------------------------------
// routes
//



/**
 *  Handles the /notifyData route.
 *
 * @param {*} req
 * @param {*} res
 */
const notifyData =
mod.reqHandler({notifyData: function(req, res) {
  sg.check(21, __filename, {req}, {res}, 'runAnywhere.context');
  console.log(`------------------------------------------------------------`);
  console.log(`[express]/notifyData invoked ${req.url}`);

  req.setTimeout(0);
  res.setTimeout(0);

  const { rax }         = ra.getContext(req.runAnywhere.context, {});
  return rax.iwrap2(function( /* abort */ ) {
    const { readData }  = rax.invokers(quickNet, 'readData');


    const reqParams           = getReqParams(req, sg.merge);
    const { argv }            = reqParams;

    const holdfor             = argv.holdfor      || argv.hold    || 500;

    return readData({...argv, holdfor}, function(err, result) {
      return _200(req, res, {items: result});
    });
  });
}});

// -------------------------------------------------------------------------------------
// routes
//

router.get('/notifyData',   notifyData);
router.put('/notifyData',   notifyData);
router.post('/notifyData',  notifyData);



// -------------------------------------------------------------------------------------
//  Functions
//

const apiMount    = '/latest';

if (require.main === module) {
  runExpressApp();
}

function runExpressApp() {
  // setDQuiet(false);

  const appName                 = ARGV._get('appname')    || ARGV._get('name');
  const stage                   = ARGV._get('stage')      || process.env.stage          || 'dev';
  const mount                   = ARGV._get('mount')      || process.env.QUICKNET_MOUNT || `quicknet`;
  const port                    = ARGV._get('port')       || process.env.QUICKNET_PORT  || 3005;

  // redis                         = libRedis.createClient(redisPort, redisHost);

  const express                 = ra.get3rdPartyLib('express');
  const app                     = express();

  // Hook into host
  ra.express_hookIntoHost(app, appName, stage, ARGV, {dbName, collNames, binaryMimeTypes});

  // Add the proxy
  const proxyOptions = {
    // https://x8edzeetn6.execute-api.us-east-1.amazonaws.com/latest/
    target        : 'https://x8edzeetn6.execute-api.us-east-1.amazonaws.com',
    changeOrigin  : true,
    onProxyReq,
    onProxyRes,
    // selfHandleResponse: true,
  };
  const apiProxy = proxy(apiProxyFilter, proxyOptions);

  app.use(apiMount, apiProxy);
  app.use(apiMount, respondFromCache);

  app.runAnywhere.use(`/${mount}`, router);

  // TODO: call app.runAnywhere.close() when done
  app.runAnywhere.listen_port(port, (err, port) => {
    // return informRoutes(appName, stage, [mount], port, () => {
    // });
  });

  return;
}

var httpCache       = {};
var cacheByteCount  = 0;
function putInCache(data, route) {
  cacheByteCount += data.length;
  httpCache[route] = data;
}

function respondFromCache(req, res, next) {
  // console.log(`need to handle ${req.url}`);

  const route = `${apiMount}${req.url}`;
  const data  = httpCache[route];
  if (data) {
    // let elapsed = new Date().getTime() - req.quickNet.start;
    // console.log(`200 [${elapsed} ms] ${data.length} bytes cached -- ${req.url}`);
    accessLog(req, res, 200, data);

    const json = sg.safeJSONParse(data) || {no:'thing'};
    return _200(req, res, json);
  }

  console.log(`respondFromCache could not find data ${route}`);
  return next();
}

function apiProxyFilter(pathname, req, res) {
  req.quickNet = {start:new Date().getTime()};

  const route = `${apiMount}${req.url}`;
  const data  = httpCache[route];

  if (!data) {
    return true;
  }

  return false;
}

function onProxyReq(proxyReq, req, res) {
}

function onProxyRes(proxyRes, req, res) {
  var body = new Buffer('');
  proxyRes.on('data', (data) => {
    body = Buffer.concat([body, data]);
  });
  proxyRes.on('end', () => {
    body = body.toString();

    // const json = sg.safeJSONParse(body) || {no:'thing'};
    // httpCache[req.url] = body;
    putInCache(body, req.url);

    // let elapsed = new Date().getTime() - req.quickNet.start;
    // console.log(`200 [${elapsed} ms] ${body.length} bytes -- ${req.url}`);
    accessLog(req, res, 200, body);
  });
}

function accessLog(req, res, code, data) {
  var elapsed = ''+ (new Date().getTime() - req.quickNet.start);
  while (elapsed.length < 8) {
    elapsed = ' '+elapsed;
  }

  var length = ''+data.length;
  while (length.length < 8) {
    length = ' '+length;
  }

  console.log(`${code} [${elapsed} ms] ${length} bytes -- ${req.url}`);
}

// // TODO: Keep pushing into reids
// function informRoutes(appName, stage, mounts, port) {

//   var   redisKey = `ns:${appName}:server:target`;
//   var   redisVal = `http://localhost:${port}/`;
//   return redis.setex(redisKey, 5, redisVal, (err, receipt) => {
//     sg.elog(`inform redis: ${redisKey} := ${redisVal}`, {err, receipt});


//     redisKey = `ns:${appName}:server:routes`;
//     redisVal =  _.map(mounts, mount => {
//       return `/${stage}/${mount}`;
//     }).join('&');

//     return redis.setex(redisKey, 5, redisVal, (err, receipt) => {
//       sg.elog(`inform redis: ${redisKey} := ${redisVal}`, {err, receipt});
//     });

//   });
// }


