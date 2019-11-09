
const {sg,fs,path,os,util,sh,die,dieAsync,grepLines,include,from,startupDone,runTopAsync,exec,execa,execz,exec_ez,find,grep,ls,mkdir,SgDir,test,tempdir,inspect} = require('sg-clihelp').all();
// const sg                      = require('sg-clihelp');
// const {fs,path,os,util}       = sg;
// const { test }                = sg.sh;
// const {execa}                 = sg;
const {mkQuickNetPath}        = require('../lib/utils');
const tarfs                   = require('tar-fs');

const ENV                     = sg.ENV();
const certsS3                 = SgDir(mkQuickNetPath('s3', ENV.at('NAMESPACE_LC'), 'secrets/certs'));

module.exports.getCert        = util.callbackify(getCert);
module.exports.async          = {};
module.exports.async.getCert  = getCert;


// --auth-domain=cdr0.net --domains=api.cdr0.net --emails=briancsparks@gmail.com
async function getCert(argv, context) {
  var   authDomain    = argv.auth_domain;
  const domains       = sg.arrayify(argv.domains);
  const fqdn          = domains[0];
  var   emails        = argv.emails;
  // var   certdir_      = argv.certdir || path.join(os.homedir(), '.quick-net', 'certs', fqdn.replace(/[.]/g, '__'));
  var   certdir       = SgDir(argv.certdir) || SgDir(os.homedir(), '.quick-net', 'certs', fqdn.replace(/[.]/g, '__'));

  // TODO: Check if we already have them, if so, do not call certbot, just return what we already have

  const params        = certbotParams(authDomain, domains, emails, certdir.path);
  // console.log(`params`, {params});

  var   certbotStdout    = await execa.stdout(sh.which('certbot').toString(), params, {cwd: __dirname});
  console.log(sg.splitLn(certbotStdout));

  var   pack = tarfs.pack(certdir.path, {
    map: (header) => {
      console.log(`fs`, {header});
      return header;
    },
    finalize: false,
    finish: () => {
      pack.entry({name: certbotStdout}, certbotStdout);
    }
  });


  // TODO: Return locations of certs, certs contents
  return {certdir, pack, certbotStdout};
}

function certbotParams(auth_domain, domains_, emails, out_dir_) {
  const domains     = sg.arrayify(domains_);
  const fqdn        = domains[0];
  const out_dir     = out_dir_      || path.join(os.homedir(), '.quick-net', 'certs', fqdn.replace(/[.]/g, '-'));

  return [
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
  ];
}

