#!/usr/bin/env node

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

var   skipLayer               = ARGV._get('skip-layer');
var   skipPush                = ARGV._get('skip-push')  || ARGV._get('dry-run');


(async function() {

  var   packageDir    = sg.path.join(process.cwd(), ARGV._[0] || '.');

  // We need the dir for package.json...
  if (!test('-f', sg.path.join(packageDir, 'package.json')))  { return sg.die(`Cannot find package.json at ${packageDir}`); }

  // ...and a --name
  var   name = ARGV._get('name,n')    ||
               sg.from(packageDir, 'package.json', 'config.quickNet.lambdaName') ||
               sg.from(packageDir, 'quick-net.json', 'lambdaName');

  if (!name)  { return sg.die(`Must provide the name of the lambda function as --name=`); }

  // ------------------------------------------------------------------------------------
  // ----- Have the dependencies changed since we last pushed the underlying layer? -----
  const packageDeps       = sg.from(packageDir, 'package.json', 'dependencies');
  const layerPackageJson  = await getLayerPackageJson(name);

  skipLayer = skipLayer || deepEqual(layerPackageJson.dependencies, packageDeps) || skipLayer;  /* final skipLayer makes it be undefined, not false */
  ARGV.d_if(skipLayer, `Will skip creating the layer`);

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

      // We need to clobber the image
      const clobber  = await execa.stdout('docker', ['image', 'rm', 'quick-lambda']);
      const clobber2 = await execa.stdout('docker', ['image', 'prune', '--force']);

      ARGV.v(`clobber`, {clobber:sg.splitLn(clobber), clobber2:sg.splitLn(clobber2)});
    }
  }

  ARGV.d(`laj`, {haveImage, skipLayer, shouldBuild});

  // Build the image?
  if (shouldBuild) {
    ARGV.d(`Rebuilding the quick-lambda image`, {haveImage});
    return execz(dockerRun, 'docker', `build`, `-t quick-lambda --progress tty -f ${__dirname}/quick-lambda/Dockerfile ${__dirname}`.split(/[ \t]+/g));
  }

  // ------------------------------------------------------------------------------------
  // ----- Run and build the release of the lambda -----
  return dockerRun();
  function dockerRun() {

    const runArgs = ['docker', 'run', '--rm',
      [`-v`, `${sg.os.homedir()}/.aws:/aws`],
      [`-v`, `${process.cwd()}:/src`],
      [`-e`, [`LAMBDA_NAME=`, name]],
      [`-e`, [`SKIP_LAYER=`,  skipLayer]],
      `quick-lambda`
    ];

    if (skipPush) { console.log(`Dry run`, {runArgs});  return; }

    ARGV.d(`docker run`, {name, skipLayer});
    return execz(null,  runArgs);
  }
})();



// ------------------------------------------------------------------------------------
function earlierThan(a, b) {
  if (b instanceof sg.fs.Stats)   { return earlierThan(a, b.mtime || ''+(new Date(b.mtimeMs))); }

  if (typeof a === 'string' && typeof b === 'string') {
    let aTime = new Date(a).getTime();
    let bTime = new Date(b).getTime();
    let diff  = bTime - aTime;

    if (diff > 0) {
      console.log(`${a} happened ${diff/1000} seconds before ${b}`);
    } else {
      console.log(`${a} happened ${-diff/1000} seconds after ${b}`);
    }

    return diff > 0;
  }

  // We cannot say that a happened before b, so undefined (which is flasy)
}

async function getLayerPackageJson(name) {
  const layerName         = `layer-for-${name}`;
  const Bucket            = `netlab-dev`;
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


