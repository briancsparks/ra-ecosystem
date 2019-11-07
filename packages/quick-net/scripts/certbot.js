
const sg                      = require('sg-clihelp');
const {fs,path,os,util}       = sg;
const { test }                = sg.sh;
const {execa}                 = sg;


module.exports.getCert = getCert;

function getCert(argv, context, callback) {
  const getCert_    = util.callbackify(getCert__);

  return getCert_(argv, context, function(err, data) {
    return callback(err, data);
  });

}

async function getCert__(argv, context) {
  var   authDomain    = argv.auth_domain;
  const domains       = sg.arrayify(argv.domains);
  const fqdn          = domains[0];
  var   emails        = argv.emails;
  var   certdir       = argv.certdir || path.join(os.homedir(), '.quick-net', 'certs', fqdn.replace(/[.]/g, '__'));

  const params        = certbotParams(authDomain, domains, emails, certdir);
  console.log(`params`, {params});
  // return {ok:true};

  // var   certbotout    = await execa.stdout(path.join(__dirname, 'certbot-get-certs'), params, {cwd: __dirname});
  var   certbotout    = await execa.stdout(path.join(__dirname, 'certbot'), params, {cwd: __dirname});
  console.log(sg.splitln(certbotout));

  return certbotout;
}

function certbotParams(auth_domain, domains_, emails, out_dir_) {
  const domains     = sg.arrayify(domains_);
  const fqdn        = domains[0];
  const out_dir     = out_dir_      || path.join(os.homedir(), '.quick-net', 'certs', fqdn.replace(/[.]/g, '-'));

  return [
    'certonly', '--non-interactive', '--manual',
    // '--manual-auth-hook', `${__dirname}/certbot-route53-auth-hook.sh UPSERT ${auth_domain}`,
    // '--manual-cleanup-hook', `${__dirname}/certbot-route53-auth-hook.sh DELETE ${auth_domain}`,
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

// certbot certonly --non-interactive --manual \
//   --manual-auth-hook "${scripts_dir}/certbot-route53-auth-hook.sh UPSERT ${auth_domain}" \
//   --manual-cleanup-hook "${scripts_dir}/certbot-route53-auth-hook.sh DELETE ${auth_domain}" \
//   --preferred-challenge dns \
//   --config-dir "$out_dir" \
//   --work-dir "$out_dir" \
//   --logs-dir "$out_dir" \
//   --agree-tos \
//   --manual-public-ip-logging-ok \
//   --domains ${domains} \
//   --email "$emails"

