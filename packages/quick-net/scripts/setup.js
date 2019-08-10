
/**
 * @file
 */

require('loud-rejection/register');
require('exit-on-epipe');

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
const {execa,sh}              = sg;
const execz                   = sg.util.promisify(sg.execz);
const qnAws                   = require('../lib/aws');

const {region}                = qnAws.defs;
const iam                     = qnAws.awsService('IAM');

const ARGV                    = sg.ARGV();
const root                    = sg.path.join(__dirname, '..');
const nginxConfDir            = 'lib/k8s/tiers/webtier/data/nginx-config/etc/nginx/conf.d';
const k8sConfigDir            = sg.path.join(root, 'lib/k8s/config');
var   dns_zone                = ARGV.dns_zone   || process.env.KOPS_CLUSTER_NAME;
const CN                      = ARGV.CN         || dns_zone;
const stage                   = ARGV.stage      || 'development';
const [z,y,...restOfName]     = dns_zone.split('.').reverse();
const clusterName             = restOfName.reverse().join('.');


async function main() {

  var   result = {};

  var   vpc           = ARGV.vpc          || 'vpc-01afe4d6ebb740f41';
  var   subnets       = ARGV.subnets      || 'subnet-09620c2e25e65dc27';

  // ---------- Create the cluster ----------

  // The params
  var clusterConfig = {
    node_count              : 2,
    zones                   : 'us-east-1c',
    master_zones            : 'us-east-1c',
    node_size               : 't3.medium',
    master_size             : 't3.medium',
    networking              : 'kube-router',
    dns_zone,
    vpc,subnets,
  };

  // The cluster is down (false), up (true), or changing ('working')
  var   cluster_is_valid = await validate_cluster();

  // ---------- If the cluster is not built, do that first ----------
  if (cluster_is_valid !== true) {
    if (cluster_is_valid !== false) {
      cluster_is_valid = ! await wait_for_cluster_down();
    }

    if (cluster_is_valid === false) {
      //  kops create cluster ...
      await execz('kops', 'create', 'cluster', ...prs(clusterConfig));
      await execz('kops', 'create', 'secret', ['sshpublickey', "admin"], ['-i', sg.path.join(sg.os.homedir(), `.ssh/id_rsa.pub`)]);
      await execz('kops', 'update', 'cluster', '--yes');

      // Add an inline policy so the master can AttachVolume on the node for MongoDB
      const PolicyDocument    = JSON.stringify(policy_AttachVolume());
      const PolicyName        = `${clusterName.replace(/[.]/g, '-')}-master-attachvolume`;
      const RoleName          = `masters.${dns_zone}`;

      const roleResult = await iam.putRolePolicy({PolicyDocument,PolicyName,RoleName}).promise();

      ARGV.v(`Creating policy for master instance role`, {PolicyDocument,PolicyName,RoleName,roleResult});

      // This takes a long time, so give a message and exit
      console.log(`\nMust wait for cluster...\n\nUse kops validate cluster to watch`);
      return [null, {...result, clusterConfig, ok:true}];
    }

    console.log(`\Cluster is not in right state`, {cluster_is_valid});
    return [null, {...result, clusterConfig, ok:true}];
  }


  // ---------- Create the webtier ----------

  const {createConfigMap}       = require('../lib/k8s/lib/config-map').async;     // Note: this fails if done before there is a cluster
  const {ensureTlsSecret}       = require('../lib/k8s/lib/tls-secret').async;

  // The nginx configuration and certs
  await createConfigMap({...ARGV.pod(), root, dir: nginxConfDir, name: 'nginxconfig'});
  await ensureTlsSecret({...ARGV.pod(), CN, name: 'nginxcert'});

  // // ---------- Create the datatier ----------
  // const setupDatatier     = await execa.stdout('node', ['./scripts/setup-datatier.js'], {cwd: root});
  // result = {...result, setupDatatier};

  // ---------- Stage-wide config ----------
  await execz('kubectl', 'apply', ['-f', `lib/k8s/config/overlays/${stage}/config-map-env.yaml`], {cwd: root});

  // ---------- All the service/deployment config files ----------
  const {serviceConfigs,mongoDeploy,deployConfigs}     = getConfigFiles();

  // Insert the services first, so DNS and ENV_VARS are available to all the deployments
  for (let service of serviceConfigs) {
    await execz('kubectl', 'apply', ['-f', service], {cwd: root});
  }

  // Deploy MongoDB first, it needs to attach the data volume
  for (let config of mongoDeploy) {
    await execz('kubectl', 'apply', ['-f', config], {cwd: root});
  }

  // Wait while MongoDB attaches and starts
  console.log(`\nWaiting to let Mongo have first chance. See:\n  kubectl describe pod mongodb-\n`);
  await msleep(8000);

  // Start the other deployments
  for (let config of deployConfigs) {
    await execz('kubectl', 'apply', ['-f', config], {cwd: root});
  }

  // ---------- Done ----------
  return [null, {...result, ok:true}];
}

sg.runTopAsync(main, 'setup-k8s-cluster');

// Should return [[--node-count, 2], [...]]
function prs(obj) {
  return sg.reduce(obj, [], (a, value, key) => {
    return sg.ap(a, [paramName(key), value]);
  });
}

// 'node_count' => '--node-count'
function paramName(key) {
  return `--${key.replace(/_/g, '-')}`;
}
async function msleep(n) {
  const timeout = ms => new Promise(res => setTimeout(res, ms));
  await timeout(n);
}

async function validate_cluster() {
  var vresult;
  try {
    vresult = await execa.stdout('kops', ['validate', 'cluster']);
    console.log(`validate cluster`, true);
    return true;
  } catch(err) {
    if (err.stderr.match(/not found/) || err.stderr.match(/does not exist/)) {
      // console.error(`--------------Cluster not validated -- waiting ${err.stderr}\n------------`);
      console.log(`validate cluster`, false);
      return false;
    }
  }
  // console.log(`jlj`, {vresult});

  console.log(`validate cluster`, 'working');
  return 'working';
}

async function wait_for_cluster_down() {
  if (await validate_cluster() === false) { return true; }
  console.log(`waiting for cluster down`);

  // 1/2 hour
  for (let i = 0; i < 1000; i++) {
    await msleep(2000);
    if (await validate_cluster() === false) {
      return true;
    }
  }

  return false;
}


function policy_AttachVolume() {
  // quack-master-attachvolume
  return {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
          "ec2:DetachVolume",
          "ec2:AttachVolume"
      ],
      "Resource": [
          "arn:aws:ec2:*:*:instance/*",
          "arn:aws:ec2:*:*:volume/*"
      ]
    }]
  };
}

function getConfigFiles() {
  const configFiles       = sh.find(sg.path.join(k8sConfigDir, 'base'));                            // Everything in the base config dirs
  const serviceConfigs    = configFiles.filter(file => file.match(/services\.yaml$/i));             // The service configs
  const allDeployConfigs  = configFiles.filter(file => file.match(/deployment\.yaml$/i));           // All the deployment configs
  const [
    mongoDeploy,
    deployConfigs]        = sg.splitArray(allDeployConfigs, file => file.match(/mongodb/i));        // The deployment configs and the MongoDB deploy config

  return {serviceConfigs, configFiles, allDeployConfigs, mongoDeploy, deployConfigs};
}



