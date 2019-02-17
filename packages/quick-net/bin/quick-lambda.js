#!/usr/bin/env node

const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg                      = require('sg-argv');
const { _ }                   = sg;
const path                    = require('path');
const fs                      = require('fs');
const os                      = require('os');
const AWS                     = require('aws-sdk');
const execa                   = require('execa');
const getStream               = require('get-stream');
const deepEqual               = require('deep-equal');
const { test }                = require('shelljs');

const s3                      = new AWS.S3({region:'us-east-1'});
const argvGet                 = sg.argvGet;
const ARGV                    = sg.ARGV();

var   skipLayer               = argvGet(ARGV, 'skip-layer');
var   skipPush                = argvGet(ARGV, 'skip-push')  || argvGet(ARGV, 'dry-run');


(async function() {
  var   json;

  var   packageDir    = path.join(process.cwd(), ARGV._[0] || '.');

  // We need the dir for package.json...
  if (!test('-f', path.join(packageDir, 'package.json')))  { return die(`Cannot find package.json at ${packageDir}`); }

  // ...and a --name
  var   name = argvGet(ARGV, 'name,n')    ||
               from(packageDir, 'package.json', 'config.quickNet.lambdaName') ||
               from(packageDir, 'quick-net.json', 'lambdaName');

  if (!name)  { return die(`Must provide the name of the lambda function as --name=`); }

  // ------------------------------------------------------------------------------------
  // ----- Have the dependencies changed since we last pushed the underlying layer? -----
  const packageDeps       = from(packageDir, 'package.json', 'dependencies');
  const layerPackageJson  = await getLayerPackageJson(name);

  skipLayer = skipLayer || deepEqual(layerPackageJson.dependencies, packageDeps) || skipLayer;  /* final skipLayer makes it be undefined, not false */
  ARGV.d_if(skipLayer, `Will skip creating the layer`);

  // ------------------------------------------------------------------------------------
  // ----- Does the docker image (quick-lambda) need to be built? -----
  var   shouldBuild, imageInfo=[{}], epStats={};

  var   dockerImages      = sg.splitLn(await execa.stdout('docker', ['image', 'ls', '-a']));        /* The list of all images in Docker */
  var   haveImage         = dockerImages.filter(line => line.match(/^quick-lambda/i)).length > 0;   /* Is ours in the list? */

  // If we dont have the image, gotta build it
  shouldBuild = !haveImage;

  // If we have the image, we must make sure it is up to date (the entry-point script changes)
  if (haveImage) {
    imageInfo     = sg.safeJSONParse(await execa.stdout('docker', ['inspect', 'quick-lambda']))       || imageInfo;
    epStats       = fs.statSync(path.join(__dirname, 'quick-lambda', 'quick-lambda-entrypoint.sh'))   || epStats;

    if (shouldBuild = earlierThan((imageInfo[0] || {}).Created, epStats)) {

      // We need to clobber the image
      const clobber  = await execa.stdout('docker', ['image', 'rm', 'quick-lambda']);
      const clobber2 = await execa.stdout('docker', ['image', 'prune', '--force']);

      ARGV.v(`clobber`, {clobber:sg.splitLn(clobber), clobber2:sg.splitLn(clobber2)});
    }
  }

  // ARGV.v(`laj`, {haveImage, skipLayer, shouldBuild});

  // Build the image?
  if (shouldBuild) {
    ARGV.d(`docker build`, {haveImage});
    return execz(dockerRun, 'docker', `build`, `-t quick-lambda --progress tty -f ${__dirname}/quick-lambda/Dockerfile ${__dirname}`.split(/[ \t]+/g));
  }

  // ------------------------------------------------------------------------------------
  // ----- Run and build the release of the lambda -----
  return dockerRun();
  function dockerRun() {

    if (skipPush) { console.log(`Dry run`, {runArgs});  return; }

    ARGV.d(`docker run`, {name, skipLayer});
    return execz(null,  ['docker', 'run', '--rm',
                        [`-v`, `${os.homedir()}/.aws:/aws`],
                        [`-v`, `${process.cwd()}:/src`],
                        [`-e`, [`LAMBDA_NAME=`, name]],
                        [`-e`, [`SKIP_LAYER=`,  skipLayer]],
                        `quick-lambda`
                      ]);
  }
})();



// ------------------------------------------------------------------------------------
function earlierThan(a, b) {
  if (b instanceof fs.Stats)   { return earlierThan(a, b.mtime || ''+(new Date(b.mtimeMs))); }

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

function execz(a, ...rest) {
  if (sg.isnt(a))                                   { return execz({next:function(){}}, ...rest); }
  if (_.isFunction(a))                              { return execz({next:a}, ...rest); }

  // execz({}, file, command, args)
  if (rest.length === 3) {
    const [ b, c, rest2 ] = rest;
    return execz(a, [...sg.arrayify(b), ...sg.arrayify(c), ...sg.arrayify(rest2) ]);
  }

  return _execz_(a, ...rest);
}

function _execz_({next,show=true}, args /*file, command, rest*/) {

  const cmdline                   = stitch(args);
  const [file, command, ...rest]  = cmdline;

  ARGV.v(`execz`, {file, command, rest, next});

  const stdout = execa(file, [command, ...rest]).stdout;

  if (show && !ARGV.quiet) {
    stdout.pipe(process.stdout);
  }

  getStream(stdout).then(content => {
    ARGV.v(`-------------------------------------------------------\n  execz exit, ${sg.splitLn(content).length} lines`);
    return (next || function(){})();
  });
}


function stitch(arrr) {
  if (typeof arrr === 'string') { return stitch(arrr.split(/[ \t]/g)); }
  return _.compact(_.flatten(arrr.map(x => stitchLevel1(x))));
}

// anyIsnt() wipes us out; if arrr is Array, make it 1-deep only, otherwise arrr
function stitchLevel1(arrr) {
  if (!Array.isArray(arrr)) { return arrr; }

  const origLen   = arrr.length;
  const arrr2     = _.compact(arrr.map(item => stitchLower(item)));

  if (arrr2.length === origLen) {
    return arrr2;
  }

  return null;
}

// anyIsnt() wipes us out; return non-Array
function stitchLower(arrr) {
  if (!Array.isArray(arrr)) { return arrr; }

  const arrr2 = arrr.map(item => stitchLower(item));
  if (sg.anyIsnt(arrr2)) {
    return null;
  }

  return arrr2.join('');
}

function die(msg, code=13) {
  console.error(msg);
  process.exit(code);
  return code;
}

function from(dirname, filename, key) {
  return sg.deref(rekwire(path.join(dirname, filename)), key);
}

function rekwire(filename) {
  try {
    return require(filename);
  } catch(error) {}
}

