

// Use `export DEBUG='*'` before starting to see all socket-io traffic
// MUST not exit too soon, or messages are not delivered

const ra                      = require('run-anywhere').v2;
ra.get3rdPartyLib('loud-rejection/register');

const sg0                     = ra.get3rdPartyLib('sg-clihelp');
const { _,sh }                = sg0;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-env'), require('..'));
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

// The last one wins. Comment out what you dont want.
// DIAG.activeDevelopment(`--stage=dev --name=smoke-net`);
DIAG.activeDevelopment(`--stage=dev --name=smoke-net --debug --verbose`);
DIAG.activeName = 'smokeTest';

mod.xport(DIAG.xport({smokeTest: async function(argv, context_, callback) {
  const {diag, ...context}    = context_;

  const {
    stage,smokeName
  }                           = diag.args();


  var   packageDir    = sg.path.join(process.cwd(), '.');

  if (!(diag.haveArgs({stage,smokeName}, {packageDir})))                { return diag.exit(); }

  sg.bigBanner('green', `BANNER`);

  diag.i(`smokeTest-i msg`, {args: {stage, smokeName, packageDir}});
  diag.d(`smokeTest-d msg`, {args: {stage, smokeName, packageDir}});
  diag.v(`smokeTest-v msg`, {args: {stage, smokeName, packageDir}});
  diag.w(`smokeTest-w msg`, {args: {stage, smokeName, packageDir}});
  diag.e(`ESOMEERROR`, `smokeTest-e msg`, {args: {stage, smokeName, packageDir}});

  return sg.setTimeout(5000, function() {
    // diag.close();
    DIAG.close();
    return callback(null, {ok:true});
  });
}}));

