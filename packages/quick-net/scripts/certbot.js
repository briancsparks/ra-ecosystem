
const {sg0,fs,path,os,util,sh,die,dieAsync,grepLines,include,from,startupDone,runTopAsync,exec,execa,execz,exec_ez,find,grep,ls,mkdir,SgDir,test,tempdir,inspect} = require('sg-clihelp').all();
// const sg                      = require('sg-clihelp');
// const {fs,path,os,util}       = sg;
// const { test }                = sg.sh;
// const {execa}                 = sg;
const sg                      = sg0.merge(sg0, require('sg-diag'));
const {safePathFqdn,
       mkQuickNetPath}        = require('../lib/utils');
const {lsS3}                  = require('../lib/s3').async;
const tarfs                   = require('tar-fs');

const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();

const dg                      = DIAG.dg;
const namespace               = ENV.lc('NAMESPACE') || 'quicknet';

const s3CertsPath             = mkQuickNetPath('s3', namespace, 'secrets/certs');

module.exports.getCert        = util.callbackify(getCert);
module.exports.async          = {};
module.exports.async.getCert  = getCert;


// --auth-domain=cdr0.net --domains=api.cdr0.net --emails=briancsparks@gmail.com
async function getCert(argv, context) {
  if (!sh.which('certbot'))           { throw sg.toError(`ENOENT: certbot`); }

  var   pack, certbotStdout;
  var   authDomain    = argv.auth_domain;
  const domains       = sg.arrayify(argv.domains);
  const fqdn          = domains[0];
  const fqdnPathName  = safePathFqdn(fqdn);
  var   emails        = argv.emails;
  var   certdir       = SgDir(argv.certdir) || SgDir(os.homedir(), '.quick-net', 'certs', fqdnPathName);
  var   tardir        = SgDir(argv.certdir) || SgDir(os.homedir(), '.quick-net', 'certs');
  const certPath      = certdir.path;

  const params        = certbotParams(authDomain, domains, emails, certPath);

  const certsTar      = tardir.file(`${fqdnPathName}.tar`);
  const certsS3tar    = s3CertsPath(`${fqdnPathName}.tar`);

  // TODO: Check if it is on S3 already
  const certOnS3  = await lsS3({s3path:certsS3tar}, context);
  const certsOnS3 = await lsS3({s3path:s3CertsPath('')}, context);

  dg.i(`params`, {params, certsS3tar, certOnS3, certsOnS3});

  if (!test('-d', params.out_dir)) {
    certbotStdout    = await execa.stdout(sh.which('certbot').toString(), params.params, {cwd: __dirname});
    console.log(sg.splitLn(certbotStdout));
  }

  if (test('-d', params.out_dir)) {
    pack = tarfs.pack(certPath, {
      map: (header) => {
        header.name = [fqdnPathName, header.name].join('/');
        console.log(`fs`, {header});
        return header;
      },
      finalize: false,
      finish: () => {
        console.log(`finish`);
        pack.entry({name: 'certbotStdout'}, certbotStdout || `certbot not run`);

        // pack.finalize();
      }
    });

    pack.pipe(fs.createWriteStream(certsTar));

    // TODO: Push to S3
  }



  // TODO: Return locations of certs, certs contents
  // return [null, {ok:true, certdir, pack, certbotStdout}];
  return [null, {ok:true, pack}];
}

function certbotParams(auth_domain, domains_, emails, out_dir_) {
  const domains     = sg.arrayify(domains_);
  const fqdn        = domains[0];
  const out_dir     = out_dir_      || path.join(os.homedir(), '.quick-net', 'certs', fqdn.replace(/[.]/g, '-'));

  return {
    domains, fqdn, out_dir,
    params: [
      'certonly', '--non-interactive', '--manual',
      '--manual-auth-hook',     `node "${__dirname}/certbot-route53-auth-hook.js" UPSERT ${auth_domain}`,
      '--manual-cleanup-hook',  `node "${__dirname}/certbot-route53-auth-hook.js" DELETE ${auth_domain}`,
      '--preferred-challenge', 'dns',
      '--config-dir', out_dir,
      '--work-dir', out_dir,
      '--logs-dir', out_dir,
      '--agree-tos',
      '--manual-public-ip-logging-ok',
      '--domains', domains.join(' '),
      '--email', emails,
  ]};
}

