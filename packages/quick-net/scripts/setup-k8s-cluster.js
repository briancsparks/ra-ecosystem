
/**
 * @file
 */

require('loud-rejection/register');
require('exit-on-epipe');

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
const {execz,execa}           = sg;
const qnAws                   = require('../lib/aws');
const {
  createConfigMap
}                             = require('../lib/k8s/lib/config-map').async;
const {
  ensureTlsSecret
}                             = require('../lib/k8s/lib/tls-secret').async;
const {
  pushNginxIngress
}                             = require('../lib/k8s/lib/push-nginx-ingress').async;

const {region}                = qnAws.defs;

const ARGV                    = sg.ARGV();
const root                    = sg.path.join(__dirname, '..');

async function main() {
  const stage     = ARGV.stage  || 'development';

  var   result = {};

  // ---------- Create the webtier ----------
  const setupWebtier      = await execa.stdout('node', ['./scripts/setup-webtier.js'], {cwd: root});
  result = {...result, setupWebtier};

  // ---------- Create the datatier ----------
  const setupDatatier     = await execa.stdout('node', ['./scripts/setup-datatier.js'], {cwd: root});
  result = {...result, setupDatatier};

  // ---------- Launch ----------
  const envConfigMap      = await execa.stdout('kubectl', ['apply', '-f', `lib/k8s/config/overlays/${stage}/config-map-env.yaml`], {cwd: root});
  result = {...result, envConfigMap};

//  const applyStage        = await execa.stdout('kubectl', ['apply', '-k', `lib/k8s/config/overlays/${stage}/`, '--record'], {cwd: root});
//  result = {...result, applyStage};


  return [null, result];
}

// Do not be too eager if we are just being required
if (require.main === module) {
  sg.runTopAsync(main, 'setup-k8s-cluster');
}


