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
const mod                     = ra.modSquad(module, 'buildLayer');

const DIAG                    = sg.DIAG(module);
const ARGV                    = sg.ARGV();
const ENV                     = sg.ENV();

const region                  = ARGV.region || 'us-east-1';
const config                  = new AWS.Config({paramValidation:false, region});
const s3                      = new AWS.S3(config);

DIAG.usage({
  aliases: {
    buildLayer: {
      args: {
        lambdaName:       'name,lambda_name',
        AWS_PROFILE:      'aws_profile,profile',
      },
    }
  }
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--lambda-name=lambda-net --stage=dev --Bucket=quick-net`);
DIAG.activeDevelopment(`--lambda-name=lambda-net --stage=dev --Bucket=quick-net --debug`);

module.exports.main =
mod.async(DIAG.async({buildLayer: async function(argv, context) {
  const diag    = DIAG.diagnostic({argv, context});

  const {stage,lambdaName,force}    = diag.args();
  var   {Bucket,AWS_PROFILE}        = diag.args();

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
    } else {
      diag.i(`package.json deps have changed -- rebuilding the layer`, {previous: prevPackageJson.dependencies, current: packageDeps});
    }
  }

  const dockerfileDir   = sg.path.join(__dirname, 'layer');
  const dockerfile      = sg.path.join(dockerfileDir, 'Dockerfile');

  sg.bigBanner('green', `Building Docker image ###`);

  runDocker(qm.stitch([`build`, [`-t`, 'quick-net-lambda-layer'], ['--progress', 'tty'], ['-f', dockerfile], '.']), {cwd: dockerfileDir});

  const runArgs = [
    [`-v`, `${sg.os.homedir()}/.aws:/aws`],
    [`-v`, `${process.cwd()}:/src`],
    [`-e`, [`AWS_PROFILE=`,     AWS_PROFILE]],
    [`-e`, [`LAMBDA_NAME=`,     lambdaName]],
    [`-e`, [`BUCKET_NAME=`,     Bucket]],
    'quick-net-lambda-layer'
  ];

  sg.bigBanner('green', `Running layer-builder in Docker ###`);
  runDocker(qm.stitch(['run', '--rm', ...runArgs]), {cwd: dockerfileDir});

  sg.bigBanner('green', `Done running layer-builder in Docker`);
  return {ok:true};




  async function runDocker(params, options) {
    var   docker;
    diag.d(`buildLayer`, {args: params, dockerfileDir});
    if (argv.dry_run || process.env.QUICKNET_DRY_RUN) {
      diag.d(`:::DRYRUN:::`);
      return;
    }

    docker = execa('docker', params, {cwd: dockerfileDir});
    dockerStdoutNoStupidMessage(docker);
    await docker;
  }
}}));

async function getPrevPackageJsonAsync(Bucket, lambdaName, callback) {
  const layerName   = `layer-for-${lambdaName}`;
  const Key         = `quick-net/lambda-layers/${layerName}/package.json`;

  var data = await s3.getObject({Bucket, Key}).promise();

  return sg.safeJSONParse(''+data.Body);
}




function dockerStdoutNoStupidMessage(docker) {

  var remainder = '';
  docker.stdout.on('data', function(chunk) {
    var lines = (remainder + chunk).split(/\r?\n/);
    remainder = lines.pop();

    for (let i = 0; i < lines.length; ++i) {
      if (!lines[i].match(/You are building a Docker image from Windows against a non-Windows Docker host/i)) {
        process.stdout.write(lines[i] + sg.os.EOL);
      }
    }

  });

  docker.stdout.on('end', function() {
    process.stdout.write(remainder + sg.os.EOL);
  });

}



