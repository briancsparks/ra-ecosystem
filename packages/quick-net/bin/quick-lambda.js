#!/usr/bin/env node

/*

#==
#== Usage:
#==
#==    _ = [<dir=[.]>]
#==
#==    --name=[@json_from(package.json).config.quickNet.lambdaName]
#==    --Bucket=[@json_from(_config/[stage]/env.json).DeployBucket]
#==    --stage=[dev]
#==
#==    --claudia-deploy
#==
#==    --prod             (stage=prod)
#==    --dev              (stage=dev)
#==    --force-layer
#==    --skip-layer
#==    --skip-push
#==    --dry-run
#==

*/

const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg                      = require('sg-clihelp');
const { _ }                   = sg;
const AWS                     = require('aws-sdk');
const deepEqual               = require('deep-equal');
const { test }                = sg.sh;
const { execz, execa }        = require('./quick-lambda/utils');

const s3                      = new AWS.S3({region:'us-east-1'});
const ARGV                    = sg.ARGV();

var   claudiaDeploy           = ARGV._get('claudia-deploy,claudia');
var   forceLayer              = ARGV._get('force-layer');
var   skipLayer               = ARGV._get('skip-layer');
var   skipPush                = ARGV._get('skip-push')    || ARGV._get('dry-run');
var   dryRun                  = ARGV._get('dry-run');
var   stage                   = ARGV._get('stage')        || (ARGV._get('prod') ? 'prod' : 'dev');

if (sg.startupDone(ARGV, __filename))  { /* return; */ }

(async function() {
  var   AWS_PROFILE;

  var   packageDir    = sg.path.join(process.cwd(), ARGV._[0] || '.');

  // We need the dir for package.json...
  if (!test('-f', sg.path.join(packageDir, 'package.json')))  { return sg.die(`Cannot find package.json at ${packageDir}`); }

  // ...and a --name
  var   name = ARGV._get('name,n')    ||
               sg.from(packageDir, 'package.json', 'config.quickNet.lambdaName') ||
               sg.from(packageDir, 'quick-net.json', 'lambdaName');

  if (!name)  { return sg.die(`Must provide the name of the lambda function as --name=`); }
  if (!stage) { return sg.die(`Must provide the stage name (like 'dev' or 'prod') as --name=`); }

  // ...and the bucket
  var   Bucket = ARGV._get('Bucket,bucket') || sg.from([packageDir, '_config', stage, 'env.json'], "DeployBucket");

  if (!Bucket) { return sg.die(`Cannot find the deploy bucket name (should be in ${sg.path.join(packageDir, '_config', stage, 'env.json')})`); }

  if (stage !== 'dev') {
    AWS_PROFILE=`quicknet${stage}`;
  }

  // ------------------------------------------------------------------------------------
  // ----- Have the dependencies changed since we last pushed the underlying layer? -----
  const packageDeps       = sg.from(packageDir, 'package.json', 'dependencies');
  const layerPackageJson  = await getLayerPackageJson(name, Bucket);

  skipLayer = skipLayer || deepEqual(layerPackageJson.dependencies, packageDeps) || skipLayer;  /* final skipLayer makes it be undefined, not false */
  if (!('dependencies' in layerPackageJson)) {
    skipLayer = null;
  }
  ARGV.d_if(!skipLayer, `Will create the layer -----`);

  // ------------------------------------------------------------------------------------
  // ----- Does the docker image (quick-lambda) need to be built? -----
  var   imageInfo=[{}], epStats={};

  var   dockerImages      = sg.splitLn(await execa.stdout('docker', ['image', 'ls', '-a']));        /* The list of all images in Docker */
  var   haveImage         = dockerImages.filter(line => line.match(/^quick-lambda/i)).length > 0;   /* Is ours in the list? */

  // If we dont have the image, gotta build it
  var   shouldBuild       = !haveImage;

  // If we have the image, we must make sure it is up to date (when the `quick-lambda-entrypoint.sh` script changes)
  if (haveImage) {
    imageInfo     = sg.safeJSONParse(await execa.stdout('docker', ['inspect', 'quick-lambda']))             || imageInfo;
    epStats       = sg.fs.statSync(sg.path.join(__dirname, 'quick-lambda', 'quick-lambda-entrypoint.sh'))   || epStats;

    if ((shouldBuild = earlierThan((imageInfo[0] || {}).Created, epStats))) {
      if (!dryRun) {
        // We need to clobber the image
        const clobber  = await execa.stdout('docker', ['image', 'rm', 'quick-lambda']);
        const clobber2 = await execa.stdout('docker', ['image', 'prune', '--force']);

        ARGV.v(`clobber`, {clobber:sg.splitLn(clobber), clobber2:sg.splitLn(clobber2)});
      }
    }
  }

  ARGV.i(`quick-lambda: going with: `, {LambdaName: name, dryRun, shouldBuild, haveImage, Bucket, skipLayer, skipPush});

  // Build the image?
  if (shouldBuild) {
    ARGV.d(`Rebuilding the quick-lambda image`, {haveImage});

    if (!dryRun) {
      return execz(dockerRun, 'docker', `build`, `-t quick-lambda --progress tty -f ${__dirname}/quick-lambda/Dockerfile ${__dirname}`.split(/[ \t]+/g));
    }
  }

  // ------------------------------------------------------------------------------------
  // ----- Run and build the release of the lambda -----
  return dockerRun();
  function dockerRun() {

    const runArgs = ['docker', 'run', '--rm',
      [`-v`, `${sg.os.homedir()}/.aws:/aws`],
      [`-v`, `${process.cwd()}:/src`],
      [`-e`, [`LAMBDA_NAME=`,     name]],
      [`-e`, [`SKIP_LAYER=`,      skipLayer]],
      [`-e`, [`FORCE_LAYER=`,     forceLayer]],
      [`-e`, [`BUCKET_NAME=`,     Bucket]],
      [`-e`, [`AWS_PROFILE=`,     AWS_PROFILE]],
      [`-e`, [`CLAUDIA_DEPLOY=`,  claudiaDeploy]],
      [`-e`, [`STAGE_NAME=`,      stage]],
      [`-e`, [`VERBOSE=`,         ARGV.verbose]],
      `quick-lambda`
    ];

    if (skipPush || dryRun) { console.log(`Dry run`, sg.inspect({runArgs}));  return; }

    ARGV.i(`docker run`, {LambdaName: name, Bucket, skipLayer, runArgs});
    return execz(null,  runArgs);
  }
})();



// ------------------------------------------------------------------------------------
function earlierThan(a_, b_) {
  if (b_ instanceof sg.fs.Stats) {
    // console.log(`earlierThan`, sg.inspect({a_,b_,bt:typeof b_.mtime,id:b_.mtime instanceof Date,k:Object.keys(b_.mtime),t:b_.mtime.getTime(),bmtime:b_.mtime,bmtimems:b_.mtimeMs}), (new Date(b_.mtimeMs)));
    return earlierThan(a_, b_.mtime);
  }

  var   a = a_;
  var   b = b_;

  if (a instanceof Date) {
    a = a.toISOString();
  }

  if (b instanceof Date) {
    b = b.toISOString();
  }

  if (typeof a === 'string' && typeof b === 'string') {
    let aTime = new Date(a).getTime();
    let bTime = new Date(b).getTime();
    let diff  = bTime - aTime;

    if (diff > 0) {
      ARGV.v(`${a} happened ${diff/1000} seconds before ${b}`);
    } else {
      ARGV.v(`${a} happened ${-diff/1000} seconds after ${b}`);
    }

    return diff > 0;
  }

  // We cannot say that a happened before b, so undefined (which is flasy)
}

async function getLayerPackageJson(name, Bucket) {
  const layerName         = `layer-for-${name}`;
  const Key               = `quick-net/lambda-layers/${layerName}/package.json`;

  try {
    let s3Object = await s3.getObject({Bucket, Key}).promise();
    if (!s3Object.Body) {
      return;
    }
    return sg.safeJSONParse(s3Object.Body.toString());
  } catch(error) {}

  return {};
}


