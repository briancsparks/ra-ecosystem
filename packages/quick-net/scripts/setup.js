
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
const ec2                     = qnAws.awsService('EC2');

const ARGV                    = sg.ARGV();
const root                    = sg.path.join(__dirname, '..');
const nginxConfDir            = 'lib/k8s/tiers/webtier/data/nginx-config/etc/nginx/conf.d';
const k8sConfigDir            = sg.path.join(root, 'lib/k8s/config');
var   dns_zone                = ARGV.dns_zone   || process.env.KOPS_CLUSTER_NAME;
const CN                      = ARGV.CN         || dns_zone;
const stage                   = ARGV.stage      || 'development';
const [z,y,...restOfName]     = dns_zone.split('.').reverse();            // z==='net' y==='netlabzero'
const clusterName             = restOfName.reverse().join('.');


async function main() {
  var   result          = {};

  var   command         = ARGV._command;

  if (!command) {
    let code = sg.die(`No command.  Use 'setup kops-cluster' or 'setup deployments'`, 5);
    return [sg.error(code, 'ENOCOMMAND')];
  }

  switch (command) {
    case 'kops-cluster':
    case 'cluster':
      return await doKopsCluster();

    case 'deployments':
    case 'deployment':
    case 'deploy':
      return await doDeployments();

    default:
      let code = sg.die(`Command ${command} is not known.  Use 'setup kops-cluster' or 'setup deployments'`, 6);
      return [sg.error(code, 'EBADCOMMAND')];
  }




  // =====================================================================
  // Helpers
  // =====================================================================

  async function doKopsCluster() {
    var   clusterConfig   = {};

    var {vpc, subnets, sgs, vpcId, subnetIds, sgIds} = await getVpcSubnetsSgs(ARGV);

    if (!vpc) {
      return [null, {...result, clusterConfig, ok:false}];
    }

    var   azLetter = (getAwsTag(vpc, 'quicknet:primaryaz') || 'c').toLowerCase();

    // ---------- Create the cluster ----------

    // The params
    clusterConfig = {
      node_count              : 2,
      zones                   : `${region}${azLetter}`, // 'us-east-1c',
      master_zones            : `${region}${azLetter}`, // 'us-east-1c',
      node_size               : 't3.medium',
      master_size             : 't3.medium',
      networking              : 'kube-router',
      vpc                     : vpcId,
      subnets                 : subnetIds,
      dns_zone,
    };

    ARGV.v(`cluster`, {qnAws: _.omit(qnAws, 'AWS'), vpc, azLetter, region});

    // return [null, {...result, clusterConfig, ok:true}];

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
        ARGV.i(`\nMust wait for cluster...\n\nUse kops validate cluster to watch`);
        return [null, {...result, clusterConfig, ok:true}];
      }

      ARGV.w(`\Cluster is not in right state`, {cluster_is_valid});
      return [null, {...result, clusterConfig, ok:false}];
    }

  }

  async function doDeployments() {

    // ---------- Create the webtier ----------

    const {createConfigMap}       = require('../lib/k8s/lib/config-map').async;     // Note: this fails if done before there is a cluster
    const {ensureTlsSecret}       = require('../lib/k8s/lib/tls-secret').async;

    var   applied = [];

    // The nginx configuration and certs
    await createConfigMap({...ARGV.pod(), root, dir: nginxConfDir, name: 'nginxconfig'});
    await ensureTlsSecret({...ARGV.pod(), CN, name: 'nginxcert'});

    // // ---------- Create the datatier ----------
    // const setupDatatier     = await execa.stdout('node', ['./scripts/setup-datatier.js'], {cwd: root});
    // result = {...result, setupDatatier};

    // ---------- Stage-wide config ----------
    applied.push(await execz('kubectl', 'apply', ['-f', `lib/k8s/config/overlays/${stage}/config-map-env.yaml`], {cwd: root}).std_out);

    // ---------- All the service/deployment config files ----------
    const {serviceConfigs,mongoDeploy,deployConfigs}     = getConfigFiles();

    // Insert the services first, so DNS and ENV_VARS are available to all the deployments
    for (let service of serviceConfigs) {
      applied.push(await execz('kubectl', 'apply', ['-f', service], {cwd: root}).std_out);
    }

    // Deploy MongoDB first, it needs to attach the data volume
    for (let config of mongoDeploy) {
      applied.push(await execz('kubectl', 'apply', ['-f', config], {cwd: root}).std_out);
    }

    // Wait while MongoDB attaches and starts
    ARGV.i(`\nWaiting to let Mongo have first chance. See:\n  kubectl describe pod mongodb-\n`);
    await msleep(8000);

    // Start the other deployments
    for (let config of deployConfigs) {
      applied.push(await execz('kubectl', 'apply', ['-f', config], {cwd: root}).std_out);
    }

    // ---------- Done ----------
    return [null, {...result, applied: applied.join('\n'), ok:true}];
  }
}

sg.runTopAsync(main, 'setup');








// ====================================================================================================
// Helpers
// ====================================================================================================

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

async function getVpcSubnetsSgs(ARGV) {
  var   vpc,subnets,sgs;
  var   vpcId         = ARGV.vpc;
  var   subnetIds     = sg.arrayify(ARGV._get('subnets,subnet'));
  var   sgIds         = sg.arrayify(ARGV._get('sgs,security-groups'));

  // Do we already have it?
  if (vpcId && vpcId.match(/^vpc-[0-9a-z]+$/i)) {
    return {vpcId, subnetIds, sgIds};
  }

  // Get all the data
  const describeVpcsPromise             = ec2.describeVpcs({}).promise();
  const describeSecurityGroupsPromise   = ec2.describeSecurityGroups({}).promise();
  const describeSubnetsPromise          = ec2.describeSubnets({}).promise();

  const allVpcs                         = (await describeVpcsPromise).Vpcs;
  const allSgs                          = (await describeSecurityGroupsPromise).SecurityGroups;
  const allSubnets                      = (await describeSubnetsPromise).Subnets;

  // Find the VPC object
  vpc         = findVpcById() || findVpcByClassB() || findVpcByName();
  if (!vpc) { return {}; }

  subnets     = [...findSubnetsById(vpc), ...findSubnetsByName(vpc)];
  sgs         = findSgsByName(vpc);

  vpcId       = vpc.VpcId;
  subnetIds   = _.map(subnets, subnet => subnet.SubnetId);
  sgIds       = _.map(sgs,     sgroup => sgroup.GroupId);

  ARGV.v(`getVpcSubnetsSgs:`, {vpc, subnets, sgs, vpcId, subnetIds, sgIds});
  return {vpc, subnets, sgs, vpcId, subnetIds, sgIds};

  // =============================================================
  // Helper functions
  // =============================================================

  // Note: in the findVpc... fns, we use `vpcId`, which is from the containing fn;
  //       in the other find... fns, we use `vpc.VpcId`, where `vpc` is passed in.

  // ----- Vpcs -----
  function findVpcById() {
    if (!vpcId) { return; }

    const foundVpcs = _.filter(allVpcs, vpc => vpc.VpcId === vpcId);
    return foundVpcs[0];
  }

  function findVpcByClassB() {
    var   classB  = ARGV._get('class_b,classB') || vpcId;
    if (!classB)  { return; }

    // Make it a string
    classB = ''+classB;

    // Must be a number 1..255
    let m = classB.match(/^([1-9][0-9]*)$/);
    if (m && m[1].length <= 3) {
      classB = m[1];
    }

    const foundVpcs = _.filter(allVpcs, vpc => (vpc.CidrBlock||'').split('.')[1] === classB);
    return foundVpcs[0];
  }

  function findVpcByName() {
    const name = ARGV.name || vpcId;
    if (!name) { return; }

    const foundVpcs = _.filter(allVpcs, vpc => getAwsTag(vpc, 'Name').toLowerCase().startsWith(name));
    return foundVpcs[0];
  }

  // ----- Subnets -----
  function findSubnetsById(vpc) {
    const foundSubnets = _.filter(allSubnets, subnet => subnet.VpcId === vpc.VpcId && subnetIds.indexOf(subnet.SubnetId) !== -1);
    return foundSubnets;
  }

  function findSubnetsByName(vpc) {
    const names = ['worker', ...subnetIds];
    const foundSubnets = _.filter(allSubnets, subnet => {
      const found = subnet.VpcId === vpc.VpcId && sg.startsWithOneOf(getAwsTag(subnet, 'Name').toLowerCase(), names);
      return found;
    });
    return foundSubnets;
  }

  // ----- Security Groups -----
  function findSgsByName(vpc) {
    const foundSgs = _.filter(allSgs, sgroup => {
      return sgroup.VpcId === vpc.VpcId && sgIds.indexOf(sgroup.GroupName) !== -1;
    });
    return foundSgs;
  }
}

function getAwsTag(obj, key) {
  return sg.reduce(obj.Tags||[], null, (m, tag) => {
    if (tag.Key === key) {
      return tag.Value;
    }
    return m;
  });
}



