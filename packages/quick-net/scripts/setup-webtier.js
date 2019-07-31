
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
const nginxConfDir            = 'lib/k8s/tiers/webtier/data/nginx-config/etc/nginx/conf.d';

async function main() {
  var   result = {};

  const awsAccount = await qnAws.getCallerAccount();
  if (!awsAccount) {
    return [`Cannot get AWS account ID`];
  }

  // ---------- Create config-map for the nginx conf ----------
  const nginxConfConfigMap = await createConfigMap({...ARGV.pod(), root, dir: nginxConfDir, name: 'nginxconfig'});
  result = {...result, nginxConfConfigMap};

  // ---------- Create secret for the nginx server certs ----------
  // TODO: Fix hardcode quack...
  const tlsSecretResult = await ensureTlsSecret({...ARGV.pod(), CN: 'quack.netlabzero.net', name: 'nginxcert'});
  result = {...result, tlsSecretResult};

  // ---------- Create web-tier Docker container ----------
  const ingressResult   = await pushNginxIngress({...ARGV.pod()});
  result = {...result, ingressResult};

  return [null, result];
}

sg.runTopAsync(main, 'setup-webtier');

