
const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg0                     = ra.get3rdPartyLib('sg-clihelp');
const { _,sh }                = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-diag'), require('sg-env'));
const mod                     = ra.modSquad(module, 'smokeTest');

const DIAG                    = sg.DIAG(module);
const ARGV                    = sg.ARGV();
// const ENV                     = sg.ENV();

DIAG.usage({
  aliases: {
    smokeTest: {
      args: {
        smokeName: 'name,smoke_name',
      }
    }
  }
});


// smokeTest --stage=dev --name=smoke-net --debug
mod.async(DIAG.async({smokeTest: async function(argv, context) {
  // sg.elog(`smokeTest`, {argv, context});
  const diag                  = DIAG.diagnostic({argv, context});

  const {
    stage,smokeName
  }                           = diag.args();
  var {
    Bucket
  }                           = diag.args();


  var   packageDir    = sg.path.join(process.cwd(), '.');
  Bucket              = Bucket        ||  argv.Bucket   || sg.from([packageDir, '_config', stage, 'env.json'], 'DeployBucket');

  if (!(diag.haveArgs({stage,smokeName}, {packageDir})))                { return diag.exit(); }

  sg.bigBanner('green', `BANNER`);

  diag.i(`smokeTest-i`, {args: {stage, smokeName, packageDir}});
  diag.d(`smokeTest-d`, {args: {stage, smokeName, packageDir}});
  diag.v(`smokeTest-v`, {args: {stage, smokeName, packageDir}});
  diag.w(`smokeTest-w`, {args: {stage, smokeName, packageDir}});
  diag.e(`smokeTest-e`, {args: {stage, smokeName, packageDir}});

  // DIAG.close();
  return {ok:true};
}}));

