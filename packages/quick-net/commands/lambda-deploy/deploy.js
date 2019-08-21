
const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg0                     = ra.get3rdPartyLib('sg-clihelp');
const { _,sh }                = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'));
const qm                      = require('quick-merge');
const {getVpcSubnetsSgs}      = require('../vpcs').async;
const execa                   = sg.execa;
const AWS                     = require('aws-sdk');
const mod                     = ra.modSquad(module, 'lambdaDeploy');

const ARGV                    = sg.ARGV();

const region                  = ARGV.region || 'us-east-1';
const config                  = new AWS.Config({paramValidation:false, region});
const s3                      = new AWS.S3(config);
const lambda                  = new AWS.Lambda(config);




mod.async({lambdaDeploy: async function(argv, context) {
  // sg.elog(`lambdaDeploy`, {argv});

  const stage         = argv.stage    || 'dev';
  const lambdaName    = argv.name     || argv.lambda_name;
  var   packageDir    = sg.path.join(process.cwd(), argv._[0] || '.');
  var   Bucket        = argv.Bucket   || sg.from([packageDir, '_config', stage, 'env.json'], 'DeployBucket');

  if (need({lambdaName,packageDir,Bucket}))                               { return sg.die(); }

  if (!argv.class_b)        { ARGV.w(`Need a way to determine vpc, like --class-b`); return; }
  var   vpcSubnetSgs  = getVpcSubnetsSgs(argv, context);

  const dockerfileDir   = sg.path.join(__dirname, 'deploy');
  const dockerfile      = sg.path.join(dockerfileDir, 'Dockerfile');
  var   docker;

  // sg.log(`lambdaDeploy`, {args: qm.stitch([`build`, [`-t`, 'quick-net-lambda-layer-deploy'], ['--progress', 'tty'], ['-f', dockerfile], '.'])});
  docker = execa('docker', qm.stitch([`build`, [`-t`, 'quick-net-lambda-layer-deploy'], ['--progress', 'tty'], ['-f', dockerfile], '.']), {cwd: dockerfileDir});
  docker.stdout.pipe(process.stdout);
  await docker;

  vpcSubnetSgs  = await vpcSubnetSgs;

  const subnet_ids = vpcSubnetSgs.subnetIds && vpcSubnetSgs.subnetIds.join(',');
  const sg_ids     = vpcSubnetSgs.sgIds     && vpcSubnetSgs.sgIds.join(',');

  const runArgs = [
    [`-v`, `${sg.os.homedir()}/.aws:/aws`],
    [`-v`, `${process.cwd()}:/src`],
    [`-e`, [`LAMBDA_NAME=`,     lambdaName]],
    [`-e`, [`BUCKET_NAME=`,     Bucket]],
    ['-e', ['subnet_ids=',      subnet_ids]],
    ['-e', ['sg_ids=',          sg_ids]],
    'quick-net-lambda-layer-deploy'
  ];

  ARGV.v(`lambdaDeploy`, {args: qm.stitch(['run', '--rm', ...runArgs])});
  docker = execa('docker', qm.stitch(['run', '--rm', ...runArgs]), {cwd: dockerfileDir});
  docker.stdout.pipe(process.stdout);
  await docker;

  return {ok:true};
}});


function need(things) {
  const result = sg.reduce(things, null, (m, v, k) => {
    if (!sg.isnt(v)) { return m; }

    return [...(m ||[]), k];
  });

  if (result === null)    { return false; }

  sg.elog(`need: ${result.join(', ')}`);
  return true;
}

