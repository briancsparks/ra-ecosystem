
const {sg,fs,path,os,util,sh,die,dieAsync,grepLines,include,from,startupDone,runTopAsync,exec,execa,execz,find,grep,ls,mkdir,test,tempdir,inspect} = require('sg-clihelp').all();
// const sg                      = require('sg-clihelp');
// const {fs,path,os,util}       = sg;
// const { test }                = sg.sh;
// const {execa}                 = sg;
const tarfs                   = require('tar-fs');

module.exports.getCert        = util.callbackify(getCert);
module.exports.async.getCert  = getCert;


// function getCert(argv, context, callback) {
//   const getCert_    = util.callbackify(getCert__);

//   return getCert_(argv, context, function(err, data) {
//     return callback(err, data);
//   });

// }



// --auth-domain=cdr0.net --domains=api.cdr0.net --emails=briancsparks@gmail.com
async function getCert(argv, context) {
  var   authDomain    = argv.auth_domain;
  const domains       = sg.arrayify(argv.domains);
  const fqdn          = domains[0];
  var   emails        = argv.emails;
  var   certdir       = argv.certdir || path.join(os.homedir(), '.quick-net', 'certs', fqdn.replace(/[.]/g, '__'));

  const params        = certbotParams(authDomain, domains, emails, certdir);
  // console.log(`params`, {params});

  var   certbotout    = await execa.stdout(sh.which('certbot'), params, {cwd: __dirname});
  console.log(sg.splitLn(certbotout));

  var   pack = tarfs.pack(certdir, {
    ignore: (name, headers) => {
      console.log(`fs`, {name,headers});
      return false;
    }
  });

  return {certdir, pack};
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

