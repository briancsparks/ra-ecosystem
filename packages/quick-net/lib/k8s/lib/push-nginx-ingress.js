
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-argv');
// const { _ }                   = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
const {execa}                 = sg;
const util                    = require('util');
const execz                   = util.promisify(sg.execz);

const mod                     = ra.modSquad(module, 'pushNginxIngress');

const ARGV                    = sg.ARGV();
const root                    = sg.path.join(__dirname, '../../..');
const dockerfileDir           = sg.path.join(root, 'lib/k8s/tiers/webtier');
const nginx_ingress           = 'quicknet-k8s-nginx-ingress';

const defs = {
  repository: 'briancsparks',
  tag:        'latest'
};

/**
 * Builds, tags, and pushes the Docker image.
 *
 * This is the 'internal' function that does all the work.
 *
 * @param {Object} argv
 * @param {string} [argv.registry]      - The optional registry (like the AWS ECR).
 * @param {string} [argv.repository]    - The optional repository (when using dockerhub).
 * @param {string} [argv.tag='latest']  - The optional tag (default: 'latest').
 * @param {Object} [context={}]         - The typical run-anywhere context object.
 *
 * @returns {Object}                    - The {localImage, repoImage} names.
 */
const _pushNginxIngress_ = mod.async({_pushNginxIngress_: async function({registry, repository, tag}, context ={}) {

  // Build params for the Docker commands (the local and repo image names)
  const localImage    = `${nginx_ingress}:${tag}`;
  const repoImage     = `${registry || repository}/${nginx_ingress}:${tag}`;

  // docker build, tag, push ...
  await execz('docker', 'build', ['-t', nginx_ingress], '.', {cwd: dockerfileDir});
  await execz('docker', 'tag', localImage, repoImage, {cwd: dockerfileDir});
  await execz('docker', 'push', repoImage, {cwd: dockerfileDir});

  return {localImage, repoImage};
}});

/**
 * Builds, tags, and pushes the Docker image.
 *
 * All parameters are optional.
 *
 * Provide `awsAccount` and `region` to use AWS ECR.
 *
 * @param {Object} argv
 * @param {string} [argv.registry]      - The optional registry (like the AWS ECR).
 * @param {string} [argv.repository]    - The optional repository (when using dockerhub).
 * @param {string} [argv.tag='latest']  - The optional tag (default: 'latest').
 * @param {string} [argv.awsAccount]    - The optional AWS account number (to automatically compute `registry`.)
 * @param {string} [argv.region]        - The optional AWS region (to automatically compute `registry`.)
 * @param {Object} [context={}]         - The typical run-anywhere context object.
 *
 * @returns {Object}                    - The {localImage, repoImage} names.
 */
mod.async({pushNginxIngress: async function(argv, context ={}) {
  var   extra = {};

  // If an AWS account number and region are provided, use AWS ECR.
  if (argv.awsAccount && argv.region) {
    extra.registry = `${argv.awsAccount}.dkr.ecr.${argv.region}.amazonaws.com`;
  }

  // TODO: fail for invalid params

  return _pushNginxIngress_({...defs, ...argv, ...extra}, context);
}});

