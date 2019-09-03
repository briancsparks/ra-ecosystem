if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg0                     = ra.get3rdPartyLib('sg-clihelp');
const { _,sh }                = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-diag'), require('sg-env'));
const qm                      = require('quick-merge');
const {getVpcSubnetsSgs}      = require('../vpcs').async;
const execa                   = sg.execa;
const AWS                     = require('aws-sdk');
const mod                     = ra.modSquad(module, 'lambdaDeploy');

const DIAG                    = sg.DIAG(module);
const ARGV                    = sg.ARGV();
const ENV                     = sg.ENV();

const region                  = ARGV.region || 'us-east-1';
const config                  = new AWS.Config({paramValidation:false, region});
const s3                      = new AWS.S3(config);
const lambda                  = new AWS.Lambda(config);

DIAG.usage({
  lambdaDeploy:{
    args: {
      lambdaName:       {aliases: 'name,lambda_name'},
      class_b:          {aliases: 'classB,b'},
      AWS_PROFILE:      {aliases: 'aws_profile,profile'},
    }
  }
});


// lambdaDeploy --stage=dev --name=lambda-net --class-b=21 --sgs=wide --debug
mod.async(DIAG.async({lambdaDeploy: async function(argv, context) {
  // sg.elog(`lambdaDeploy`, {argv, context});
  const diag                  = DIAG.diagnostic({argv, context});

  const {
    stage,lambdaName,class_b
  }                           = diag.args();
  var {
    Bucket,AWS_PROFILE
  }                           = diag.args();


  var   packageDir    = sg.path.join(process.cwd(), '.');
  Bucket              = Bucket        ||  argv.Bucket   || sg.from([packageDir, '_config', stage, 'env.json'], 'DeployBucket');
  AWS_PROFILE         = AWS_PROFILE   || ENV.at('AWS_PROFILE');

  if (!(diag.haveArgs({stage,lambdaName,class_b,Bucket}, {packageDir,AWS_PROFILE})))                { return diag.exit(); }

  // Notice we invoke getVpcSubnetsSgs here, but await the result after we do `docker build ...`
  var   vpcSubnetSgs    = /*nowait*/ getVpcSubnetsSgs(argv, context);

  const dockerfileDir   = sg.path.join(__dirname, 'deploy');
  const dockerfile      = sg.path.join(dockerfileDir, 'Dockerfile');

  sg.bigBanner('yellow', `Building deployer Docker image ###`);
  runDocker(qm.stitch([`build`, [`-t`, 'quick-net-lambda-layer-deploy'], ['--progress', 'tty'], ['-f', dockerfile], '.']), {cwd: dockerfileDir});

  vpcSubnetSgs  = await vpcSubnetSgs;

  const subnet_ids = vpcSubnetSgs && vpcSubnetSgs.subnetIds && vpcSubnetSgs.subnetIds.join(',');
  const sg_ids     = vpcSubnetSgs && vpcSubnetSgs.sgIds     && vpcSubnetSgs.sgIds.join(',');

  const runArgs = [
    [`-v`, `${sg.os.homedir()}/.aws:/aws`],
    [`-v`, `${process.cwd()}:/src`],
    [`-e`, [`AWS_PROFILE=`,       AWS_PROFILE]],
    [`-e`, [`LAMBDA_NAME=`,       lambdaName]],
    [`-e`, [`BUCKET_NAME=`,       Bucket]],
    [`-e`, [`ENVIRONMENT_FILE=`,  ['_config', stage, 'env.json'].join('/')]],
    ['-e', ['subnet_ids=',        subnet_ids]],
    ['-e', ['sg_ids=',            sg_ids]],
    'quick-net-lambda-layer-deploy'
  ];

  sg.bigBanner('yellow', `Running ${lambdaName} deployer in Docker ###`);
  runDocker(qm.stitch(['run', '--rm', ...runArgs]), {cwd: dockerfileDir});

  sg.bigBanner('yellow', `Done running ${lambdaName} deployer in Docker`);
  return {ok:true};




  async function runDocker(params, options) {
    var   docker;
    diag.d(`lambdaDeploy`, {args: params, dockerfileDir});

    if (argv.dry_run || process.env.QUICKNET_DRY_RUN) {
      diag.d(`:::DRYRUN:::`);
      return;
    }

    docker = execa('docker', params, {cwd: dockerfileDir});
    docker.stdout.pipe(process.stdout);
    await docker;
  }
}}));


