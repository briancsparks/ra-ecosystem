
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg0;
const os                      = require('os');
const qm                      = require('quick-merge').qm;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
const Request                 = require('kubernetes-client/backends/request');
const Client                  = require('kubernetes-client').Client;
const Kutils                  = require('./lib/utils');
const pem                     = require('pem');
const util                    = require('util');
const {execz,execa}           = sg;
const {test}                  = sg.sh;

const mod                     = ra.modSquad(module, 'kubectl');

// const backend                 = new Request(Request.config.fromKubeconfig(`${os.homedir()}/.kube/config`));
// const client                  = new Client({backend, version: '1.13'});

sg.ARGV();

mod.async({nginxConfConfigMap: async function(argv, context) {
  var result = {};

  // You can get the file back out of config-space:
  // get configmaps nginxconfig -o json | jq -r '.data["default.conf"]'

  try {
    const confdir = theDir(argv, __dirname);

    result        = await execa.stdout('kubectl', ['create', 'configmap', 'nginxconfig', `--from-file=${confdir}`, '-o', 'json', '--dry-run']);
    const json    = sg.safeJSONParse(result);

    var currentConfigMap;
    try {
      currentConfigMap = await Kutils.getKClient().api.v1.namespace(ns(argv)).configmap('nginxconfig').get();
    } catch(err) {
    }

    if (currentConfigMap) {
      result = await Kutils.getKClient().api.v1.namespace(ns(argv)).configmaps('nginxconfig').put({body: json});
    } else {
      result = await Kutils.getKClient().api.v1.namespace(ns(argv)).configmap.post({body: json});
    }

  } catch(err) {
    throw err;
  }

  return result;
}});

mod.async({ensureCerts: async function(argv, context) {
  try {
    const name = 'nginxcert';
    const secret = await Kutils.getKClient().api.v1.namespaces(ns(argv)).secrets(name).get();

    return secret;
  } catch(err) {
    if (err.code !== 404) { throw err; }
  }

  //openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout ${NGINX_KEY} -out ${NGINX_CRT} -subj "/CN=mario/O=mario"
  const CN        = argv.CN || argv.cn || 'mario';
  const crtfile   = '/tmp/nginx.crt';
  const keyfile   = '/tmp/nginx.key';

  const params = [
    "req", "-x509", "-nodes",

    "-days",   "365",               "-newkey", "rsa:4096",
    "-keyout", keyfile,             "-out",    crtfile,
    "-subj",   `/CN=${CN}/O=${CN}`
  ];

  const output = await execa.stdout("openssl", params);

  //kubectl create secret tls nginxcert --key ${NGINX_KEY} --cert ${NGINX_CRT}
  const result = await execa.stdout("kubectl", ["create", "secret", "tls", "nginxcert", "--key", keyfile, "--cert", crtfile]);

  return {result};
}});

mod.async({deployWebtier: async function(argv, context) {
  const manifest      = nginxDeployment();
  var   createReceipt = await Kutils.getKClient().apis.apps.v1.namespaces(ns(argv)).deployments.post({body: manifest});
  const deployment    = await Kutils.getKClient().apis.apps.v1.namespaces(ns(argv)).deployments(manifest.metadata.name).get();

  const serviceSpec   = nginxService();
  createReceipt       = await Kutils.getKClient().api.v1.namespaces(ns(argv)).services.post({body: serviceSpec});

  return deployment;
}});

// -----------------------------
// Certbot howto
//
// Here is how to do letsencrypt. this is the certbot-route53-auth-hook.js file:
// -----------------------------

// const AWS       = require('aws-sdk');
// const route53   = new AWS.Route53();
//
// const [x,y, action, domain] = process.argv;
//
// (async function main() {
//   try {
//     const {HostedZones} = await route53.listHostedZonesByName({DNSName: domain}).promise();
//
//     if (HostedZones.length > 0) {
//       const zone = HostedZones[0];
//       if (zone.Name === `${domain}.`) {
//         const HostedZoneId = zone.Id;
//         const ChangeBatch = changeBatch();
//         const {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();
//         const result = await route53.waitFor('resourceRecordSetsChanged', {Id: ChangeInfo.Id}).promise();
//       }
//     }
//   } catch(err) {
//     console.error(err);
//     process.exit(3);
//   }
// }());
//
// function changeBatch() {
//   return {
//     Changes: [{
//       Action: action,
//       ResourceRecordSet: {
//         Name: `_acme-challenge.${process.env.CERTBOT_DOMAIN}.`,
//         ResourceRecords: [{Value:`"${process.env.CERTBOT_VALIDATION}"`}],
//         TTL: 30,
//         Type: "TXT"
//       }
//     }],
//   };
// }

// And here is the command to fire
// #!/bin/bash -e
//
// die() {
//   echo "$@"
//   exit 2
// }
//
// scripts_dir="$(dirname $0)"
// out_dir="$HOME/.letsencrypt"
//
// [ -d "$out_dir" ] || die "Must have $out_dir dir"
//
// auth_domain="$1"
// domains="$2"
// emails="$3"
//
// [ -z "$auth_domain" ] && die "Usage: $(basename $0) auth_domain domains emails"
// [ -z "$domains" ] && die "Usage: $(basename $0) auth_domain domains emails"
// [ -z "$emails" ] && die "Usage: $(basename $0) auth_domain domains emails"
//
// certbot certonly --non-interactive --manual \
//   --manual-auth-hook "${scripts_dir}/certbot-route53-auth-hook.sh UPSERT ${auth_domain}" \
//   --manual-cleanup-hook "${scripts_dir}/certbot-route53-auth-hook.sh DELETE ${auth_domain}" \
//   --preferred-challenge dns \
//   --config-dir "$out_dir" \
//   --work-dir "$out_dir" \
//   --logs-dir "$out_dir" \
//   --agree-tos \
//   --manual-public-ip-logging-ok \
//   --domains ${domains} \
//   --email "$emails"




function base64(str) {
  const buff = new Buffer(str);
  return buff.toString('base64');
}

function ns(argv) {
  return argv.namespace || argv.ns || 'default';
}

function nginxDeployment() {

  const options = {
    ports: [{
      containerPort: 80
    },{
      containerPort: 443
    }]
  };

  var deployment = deploymentSeed('nginx', 'briancsparks/quicknet-nginx-ingress', {app:'nginx'}, options);

  var spec          = deployment.spec.template.spec;
  var container     = spec.containers[0];

  spec              = addPodVolume(spec, {secretName: 'nginxcert'}, '/etc/nginx/ssl');
  spec              = addPodVolume(spec, {configMapName: 'nginxconfig'}, '/etc/nginx/conf.d');

  container         = {...container,
    command:  ["/usr/bin/auto-reload-nginx"],
    args:     ["-g","daemon off;"],

    livenessProbe: {
      httpGet: {
        path: "/index.html",
        port: 80
      },
      initialDelaySeconds: 30,
     timeoutSeconds: 1
    },

    lifecycle: {
      preStop: {
        exec: {
          command: ["/usr/sbin/nginx","-s","quit"]
        }
      }
    }
  };

  spec.containers   = [container];
  deployment.spec.template.spec   = spec;

  return deployment;
}

function nginxService() {

  const name = 'nginx';

  return {
    apiVersion:   'v1',
    kind:         'Service',

    metadata: {name},

    spec: {
      type: 'LoadBalancer',
      selector: {app:name},
      ports: [{
        name: 'http',  protocol: 'TCP', port: 80,  targetPort: 80
      }, {
        name: 'https', protocol: 'TCP', port: 443, targetPort: 443
      }]
    }
  };
}

function deploymentSeed(name, image, labels, options={}) {

  var result = {
    apiVersion:   'apps/v1',
    kind:         'Deployment',

    metadata: {labels, name},

    spec: {
      replicas: 1,
      selector: {
        matchLabels: labels
      },

      // The pod template
      template: {
        metadata:{labels},

        spec: {
          containers: [{image, name}]
        }
      }
    }
  };

  if (options.port) {
    const container = qm(result.spec.template.spec.containers[0], {ports: options.ports});
    result.spec.template.spec.containers[0] = container;
  }

  return result;
}

function addPodVolume(podSpec_, nameSpec, mountPath) {

  var podSpec     = _.extend({}, podSpec_);
  var container   = podSpec.containers[0];
  var name;

  podSpec.volumes         = podSpec.volumes         || [];
  container.volumeMounts  = container.volumeMounts  || [];

  if (sg.firstKey(nameSpec) === 'secretName') {
    name = nameSpec.secretName;
    podSpec.volumes.push({name: `${name}-volume`, secret:{secretName: name}});
  }

  if (sg.firstKey(nameSpec) === 'configMapName') {
    name = nameSpec.configMapName;
    podSpec.volumes.push({name: `${name}-volume`, configMap:{name}});
  }

  container.volumeMounts.push({name: `${name}-volume`, mountPath});

  return podSpec;
}

function tlsSecret(name, keys) {
  return {
    apiVersion:   'v1',
    kind:         'Secret',
    type:         'tls',

    metadata: {
      name
    },

    data: {
      "tls.key": base64(keys.certificate),
      "tls.crt": base64(keys.serviceKey)
    }
  };
}

function theDir(argv, dirname) {
  var   confdir = argv.confdir;

  // They might have sent in a full-path
  if (confdir && confdir[0] === '/') {
    return confdir;
  }

  // Or it might be relative to cwd
  confdir = sg.path.join(process.cwd(), confdir || '.');
  if (test('-d', confdir)) {
    return confdir;
  }

  // Or it might be relative to our dir
  confdir = sg.path.join(dirname, confdir);
  if (test('-d', confdir)) {
    return confdir;
  }

  return;
}

