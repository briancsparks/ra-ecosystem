
const {sg0,fs,path,os,util,sh,die,dieAsync,grepLines,include,from,startupDone,runTopAsync,exec,execa,execz,exec_ez,find,grep,ls,mkdir,SgDir,test,tempdir,inspect} = require('sg-clihelp').all();
// const sg                      = require('sg-clihelp');
// const {fs,path,os,util}       = sg;
// const { test }                = sg.sh;
// const {execa}                 = sg;
const sg                      = sg0.merge(sg0, require('sg-diag'));
const {safePathFqdn,
       mkQuickNetPath}        = require('../lib/utils');
const libS3                   = require('../lib/s3');
const {lsS3}                  = libS3.async;
const putTarToS3              = util.promisify(libS3.putTarToS3);
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

  var   result        = {ok:false};
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

  try {

    // Check if it is on S3 already
    const certOnS3  = await lsS3({s3path:certsS3tar}, context);
    result = {...result, s3path:certsS3tar};

    dg.v(`params`, {params, certsS3tar, certOnS3});

    if (certOnS3.KeyCount > 0) {
      dg.iv(`The cert for ${fqdn} already exists at ${certsS3tar}.`, null, {certOnS3});
      return [null, sg.merge(result, {ok:true, msg:'Not Modified'})];
    }

    // Generate with certbot, if we do not already have it
    if (!test('-d', params.out_dir)) {
      dg.i(`Generating cert for ${domains.join(', ')}`);

      certbotStdout   = await execa.stdout(sh.which('certbot').toString(), params.params, {cwd: __dirname});
      result          = {...result, certbotStdout};

      dg.d(`certbot said:`, sg.splitLn(certbotStdout));
    }

    // If we have something, pack it up and send to S3
    if (test('-d', params.out_dir)) {
      dg.i(`Packing ${params.out_dir}...`);

      pack = tarfs.pack(certPath, {
        map: (header) => {

          header.name  = [fqdnPathName, header.name].join('/');
          header.uname = 'root';
          header.gname = 'root';

          dg.iv(`  ${header.name}`, null, {header});

          return header;
        },

        finalize: false,
        finish: () => {
          const header = {name: `${fqdnPathName}/certbotStdout`, uname: 'root', gname: 'root'};
          pack.entry(header, certbotStdout || `certbot not run`);

          dg.iv(`  ${header.name}`, null, {header});

          pack.finalize();
        }
      });

      // Push to S3
      dg.i(`Storing ${certsS3tar}...`);
      const s3data = await putTarToS3(pack, {s3path:certsS3tar});
      result = {...result, pack, s3data};

      dg.iv(`Stored ${certsS3tar}`, null, {s3data});
    }
  } catch(err) {
    dg.e(`getCert error`, err);
    return [err, {ok:false}];
  }

  return [null, sg.merge(result, {ok:true})];
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

