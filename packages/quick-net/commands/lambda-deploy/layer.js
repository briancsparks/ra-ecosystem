
const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg0                     = ra.get3rdPartyLib('sg-clihelp');
const { _,sh }                = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-diag'), require('../../../sg-env'));
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

mod.async({deployLayer: async function(argv, context) {
  // sg.elog(`mkDepLayer`, {argv});
  const diag          = DIAG.diagnostic({argv, context});

  diag.v(`deployLayer`, {argv, context});

  const {
    stage,lambdaName,force,
  }                           = diag.args('deployLayer');
  var {
    Bucket,AWS_PROFILE
  }                           = diag.args('deployLayer');

  var   packageDir    = sg.path.join(process.cwd(), argv._[0] || '.');
  Bucket              = argv.Bucket   || sg.from([packageDir, '_config', stage, 'env.json'], 'DeployBucket');
  AWS_PROFILE         = AWS_PROFILE   || ENV.at('AWS_PROFILE');

  if (!diag.haveArgs({lambdaName,packageDir,Bucket}))                     { return diag.exit(); }

  // Determine if package is out of date, forcing a rebuild
  if (!force) {
    const packageDeps       = sg.from(packageDir, 'package.json', 'dependencies');
    const prevPackageJson   = await getPrevPackageJsonAsync(Bucket, lambdaName);

    if (deepEqual(packageDeps, prevPackageJson.dependencies)) {
      diag.i(`package.json deps have not changed (use --force if needed)`);
      return {ok:true};
    }
  }

  const dockerfileDir   = sg.path.join(__dirname, 'layer');
  const dockerfile      = sg.path.join(dockerfileDir, 'Dockerfile');
  var   docker;

  diag.d(`deployLayer`, {args: qm.stitch([`build`, [`-t`, 'quick-net-lambda-layer-deploy'], ['--progress', 'tty'], ['-f', dockerfile], '.']), dockerfileDir});
  docker = execa('docker', qm.stitch([`build`, [`-t`, 'quick-net-lambda-layer-deploy'], ['--progress', 'tty'], ['-f', dockerfile], '.']), {cwd: dockerfileDir});
  docker.stdout.pipe(process.stdout);
  await docker;

  const runArgs = [
    [`-v`, `${sg.os.homedir()}/.aws:/aws`],
    [`-v`, `${process.cwd()}:/src`],
    [`-e`, [`AWS_PROFILE=`,     AWS_PROFILE]],
    [`-e`, [`LAMBDA_NAME=`,     lambdaName]],
    [`-e`, [`BUCKET_NAME=`,     Bucket]],
    'quick-net-lambda-layer-deploy'
  ];

  diag.d(`deployLayer`, {args: qm.stitch(['run', '--rm', ...runArgs])});
  docker = execa('docker', qm.stitch(['run', '--rm', ...runArgs]), {cwd: dockerfileDir});
  docker.stdout.pipe(process.stdout);
  await docker;

  return {ok:true};
}});

async function getPrevPackageJsonAsync(Bucket, lambdaName, callback) {
  const layerName   = `layer-for-${lambdaName}`;
  const Key         = `quick-net/lambda-layers/${layerName}/package.json`;

  var data = await s3.getObject({Bucket, Key}).promise();

  return sg.safeJSONParse(''+data.Body);
}


// mod.xport({mkDepLayer: function(argv, context, callback) {
//   // sg.elog(`mkDepLayer`, {argv});

//   const stage         = argv.stage    || 'dev';
//   const lambdaName    = argv.name     || argv.lambda_name;
//   var   packageDir    = sg.path.join(process.cwd(), argv._[0] || '.');
//   var   Bucket        = argv.Bucket   || sg.from([packageDir, '_config', stage, 'env.json'], 'DeployBucket');

//   if (need({lambdaName,packageDir,Bucket}))                               { return sg.die(); }

//   // Force?
//   if (ARGV.force) {
//     return dockerRun();
//   }

//   // Determine if package is out of date, forcing a rebuild
//   const packageDeps       = sg.from(packageDir, 'package.json', 'dependencies');
//   return getPrevPackageJson(Bucket, lambdaName, function(err, prevPackageJson) {
//     if (deepEqual(packageDeps, prevPackageJson.dependencies)) {
//       ARGV.i(`package.json deps have not changed (use --force if needed)`, {packageDeps, prevPackageJson: prevPackageJson.dependencies});
//       ARGV.i(`(use --force if needed)`);
//       return callback(null, {ok:true});
//     }

//     return dockerRun();
//   });

//   function dockerRun() {
//     execz('docker', `build`, [`-t`, 'quick-net-lambda-layer-deploy'], ['--progress', 'tty'], ['-f', `${__dirname}/layer/Dockerfile`], '.', {cwd: __dirname});

//     const runArgs = [
//       [`-v`, `${sg.os.homedir()}/.aws:/aws`],
//       [`-v`, `${process.cwd()}:/src`],
//       [`-e`, [`LAMBDA_NAME=`,     lambdaName]],
//       [`-e`, [`BUCKET_NAME=`,     Bucket]],
//       'quick-net-lambda-layer-deploy'
//     ];

//     if (ARGV.skip_push || ARGV.dry_run) { console.log(`Dry run`, sg.inspect({runArgs}));  return callback(null, {dryRun:true}); }

//     ARGV.v(`docker run`, {LambdaName: lambdaName, Bucket, runArgs, arg2: {cwd: __dirname}});

//     var result;
//     result = execz('docker', 'run', '--rm', ...runArgs, {cwd: __dirname});

//     return callback(null, result);
//   }
// }});

// function getPrevPackageJson(Bucket, lambdaName, callback) {
//   const layerName   = `layer-for-${lambdaName}`;
//   const Key         = `quick-net/lambda-layers/${layerName}/package.json`;

//   return s3.getObject({Bucket, Key}, function(err, s3Object) {
//     ARGV.v(`gots3obj`, {Bucket, Key, err, s3Object});

//     if (sg.ok(err, s3Object)) {
//       return callback(null, sg.safeJSONParse(s3Object.Body.toString()));
//     }

//     console.error(err, sg.inspect({err, s3Object}));
//     return callback(err);
//   });
// }


// function need(things) {
//   const result = sg.reduce(things, null, (m, v, k) => {
//     if (!sg.isnt(v)) { return m; }

//     return [...(m ||[]), k];
//   });

//   if (result === null)    { return false; }

//   sg.elog(`need: ${result.join(', ')}`);
//   return true;
// }

