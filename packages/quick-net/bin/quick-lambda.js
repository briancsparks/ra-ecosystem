#!/usr/bin/env node

const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg                      = require('sg-argv');
const { _ }                   = sg;
const path                    = require('path');
const fs                      = require('fs');
const os                      = require('os');
const execa                   = require('execa');
const getStream               = require('get-stream');
const {
  test
}                             = require('shelljs');

const argvGet                 = sg.argvGet;
const ARGV                    = sg.ARGV();

const skipLayer               = argvGet(ARGV, 'skip-layer');
var   skipPush                = argvGet(ARGV, 'skip-push')  || argvGet(ARGV, 'dry-run');


(async function() {
  var   json;

  var   packageDir    = path.join(process.cwd(), ARGV._[0] || '.');

  // We need the dir for package.json...
  if (!test('-f', path.join(packageDir, 'package.json')))  { return die(`Cannot find package.json at ${packageDir}`); }

  // ...and a --name
  var   name = argvGet(ARGV, 'name,n')    ||
               from(packageDir, 'package.json', 'config.quickNet.lambdaName') ||
               from(packageDir, 'quick-net.json', 'lambdaName')
               from(packageDir, 'package.json', 'name');

  var stdout  = sg.splitLn(await execa.stdout('docker', ['image', 'ls', '-a']));

  // console.log(`docker image`, {stdout});

  // Build the image?
  if (stdout.filter(line => line.match(/^quick-lambda/i)).length === 0) {
    return execz(runit, 'docker', `build`, `-t quick-lambda --progress tty -f ${__dirname}/quick-lambda/Dockerfile ${__dirname}`.split(/[ \t]+/g));
  }

  return runit();
  function runit() {

    // Now, docker run...
    const runArgs = stitch([
      `--rm`,
      `-v`, `${os.homedir()}/.aws:/aws`,
      `-v`, `${process.cwd()}:/src`,
      [`-e`, [`LAMBDA_NAME=`, name]],
      [`-e`, [`SKIP_LAYER=`,  skipLayer]],
      `quick-lambda`
    ]);

    if (skipPush) { console.log(`Dry run`, {runArgs});  return; }

    return execz(null, 'docker', 'run', runArgs);
  }
})();

function execz(next, file, command, rest) {

  console.log(`execz`, sg.inspect({file, command, rest, next}));

  const stdout = execa(file, [command, ...rest]).stdout;
  stdout.pipe(process.stdout);
  getStream(stdout).then(content => {
    console.log(`-------------------------------------------------------\n  execz exit, ${sg.splitLn(content).length} lines`);
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

