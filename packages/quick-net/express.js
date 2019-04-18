


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg;
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

const redisPort               = process.env.redis_port  || process.env.REDIS_PORT || 6379;
const redisHost               = process.env.redis       || process.env.REDIS;

const collNames               = (process.env.QUICKNET_COLLECTIONS || 'users').split(',');
const dbName                  = process.env.QUICKNET_DB_NAME      || 'quicknet';
const binaryMimeTypes = [
	'application/octet-stream',
	'font/eot',
	'font/opentype',
	'font/otf',
	'image/jpeg',
	'image/png',
	'image/svg+xml'
];


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

runExpressApp();

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

  app.runAnywhere.use(`/${mount}`, router);

  // TODO: call app.runAnywhere.close() when done
  app.runAnywhere.listen_port(port, (err, port) => {
    // return informRoutes(appName, stage, [mount], port, () => {
    // });
  });

  return;
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


