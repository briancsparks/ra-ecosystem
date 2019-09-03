if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg0                     = ra.get3rdPartyLib('sg-clihelp');
const { _,sh }                = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-diag'), require('sg-env'));
const qm                      = require('quick-merge');
const execz                   = sg.execz;
const execa                   = sg.execa;
const deepEqual               = require('deep-equal');
const AWS                     = require('aws-sdk');
const mod                     = ra.modSquad(module, 'lambdaLayer');

const DIAG                    = sg.DIAG(module);
const ARGV                    = sg.ARGV();
const ENV                     = sg.ENV();

const region                  = ARGV.region || 'us-east-1';
const config                  = new AWS.Config({paramValidation:false, region});
const s3                      = new AWS.S3(config);

DIAG.usage({
  deployLayer:{
    args: {
      lambdaName:       {aliases: 'name,lambda_name'},
      AWS_PROFILE:      {aliases: 'aws_profile,profile'},
    },
  }
});

mod.async(DIAG.async({deployLayer: async function(argv, context) {
  // sg.elog(`deployLayer`, {argv, context});
  const diag          = DIAG.diagnostic({argv, context});

  diag.v(`deployLayer`, {argv, context});

  const {
    stage,lambdaName,force,
  }                           = diag.args();
  var {
    Bucket,AWS_PROFILE
  }                           = diag.args();

  var   packageDir    = sg.path.join(process.cwd(), '.');
  Bucket              = argv.Bucket   || sg.from([packageDir, '_config', stage, 'env.json'], 'DeployBucket');
  AWS_PROFILE         = AWS_PROFILE   || ENV.at('AWS_PROFILE');

  if (!diag.haveArgs({stage,lambdaName,Bucket}, {packageDir,AWS_PROFILE}))                     { return diag.exit(); }

  // Determine if package is out of date, forcing a rebuild
  if (!force) {
    const packageDeps       = sg.from(packageDir, 'package.json', 'dependencies');
    const prevPackageJson   = await getPrevPackageJsonAsync(Bucket, lambdaName);

    if (deepEqual(packageDeps, prevPackageJson.dependencies)) {
      diag.i(`package.json deps have not changed (use --force if needed)` /*, {previous: prevPackageJson.dependencies, current: packageDeps} */);
      return {ok:true};
    }
  }

  const dockerfileDir   = sg.path.join(__dirname, 'layer');
  const dockerfile      = sg.path.join(dockerfileDir, 'Dockerfile');

  sg.bigBanner('green', `Building Docker image ###`);

  runDocker(qm.stitch([`build`, [`-t`, 'quick-net-lambda-layer-deploy'], ['--progress', 'tty'], ['-f', dockerfile], '.']), {cwd: dockerfileDir});

  const runArgs = [
    [`-v`, `${sg.os.homedir()}/.aws:/aws`],
    [`-v`, `${process.cwd()}:/src`],
    [`-e`, [`AWS_PROFILE=`,     AWS_PROFILE]],
    [`-e`, [`LAMBDA_NAME=`,     lambdaName]],
    [`-e`, [`BUCKET_NAME=`,     Bucket]],
    'quick-net-lambda-layer-deploy'
  ];

  sg.bigBanner('green', `Running layer-builder-deployer in Docker ###`);
  runDocker(qm.stitch(['run', '--rm', ...runArgs]), {cwd: dockerfileDir});

  sg.bigBanner('green', `Done running layer-builder-deployer in Docker`);
  return {ok:true};




  async function runDocker(params, options) {
    var   docker;
    diag.d(`deployLayer`, {args: params, dockerfileDir});

    if (argv.dry_run || process.env.QUICKNET_DRY_RUN) {
      diag.d(`:::DRYRUN:::`);
      return;
    }

    docker = execa('docker', params, {cwd: dockerfileDir});
    docker.stdout.pipe(process.stdout);
    await docker;
  }
}}));

async function getPrevPackageJsonAsync(Bucket, lambdaName, callback) {
  const layerName   = `layer-for-${lambdaName}`;
  const Key         = `quick-net/lambda-layers/${layerName}/package.json`;

  var data = await s3.getObject({Bucket, Key}).promise();

  return sg.safeJSONParse(''+data.Body);
}



