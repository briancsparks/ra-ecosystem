
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg0;
const qm                      = require('quick-merge').qm;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
const Kutils                  = require('./utils');
const os                      = require('os');
const tmp                     = require('tmp');
const Request                 = require('kubernetes-client/backends/request');
const Client                  = require('kubernetes-client').Client;
const pem                     = require('pem');
const util                    = require('util');
const {execz,execa}           = sg;
const {test}                  = sg.sh;

const mod                     = ra.modSquad(module, 'tlsCerts');

const backend                 = new Request(Request.config.fromKubeconfig(`${os.homedir()}/.kube/config`));
const client                  = new Client({backend, version: '1.13'});

const {ns,isFile,isDir}       = Kutils;

sg.ARGV();

const _createTlsSecret_ = mod.async({_createTlsSecret_: async function(argv, context ={}) {

  const {keyfile,crtfile,name} = argv;

  //kubectl create secret tls nginxcert --key ${NGINX_KEY} --cert ${NGINX_CRT}
  const result = await execa.stdout("kubectl", ["create", "secret", "tls", name, "--key", keyfile, "--cert", crtfile]);

  return result;
}});

mod.async({createTlsSecret: async function(argv, context ={}) {

  const {keyfile,crtfile,name} = argv;

  // TODO: exit if we do not have params

  return _createTlsSecret_({...argv,keyfile,crtfile,name}, context);
}});

const _ensureTlsSecret_ = mod.async({_ensureTlsSecret_: async function(argv, context ={}) {

  const {name,namespace} = argv;

  try {
    // This will throw 404 if not found
    const secret = await client.api.v1.namespaces(namespace).secrets(name).get();
    return {result: !!secret};

  } catch(err) {
    // 404 is just that we do not have the secrets yet
    if (err.code !== 404) { throw err; }
  }

  //openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout ${NGINX_KEY} -out ${NGINX_CRT} -subj "/CN=mario/O=mario"
  const CN        = argv.CN;
  var   crtfile, keyfile;

  var   result = {};

  try {

    crtfile   = tmp.fileSync({mode: 0o644, prefix: 'nginxcrt-', postfix: '.crt', discardDescriptor: true});
    keyfile   = tmp.fileSync({mode: 0o644, prefix: 'nginxkey-', postfix: '.key', discardDescriptor: true});

    const openSslParams = [
      "req", "-x509", "-nodes",

      "-days",   "365",               "-newkey", "rsa:4096",
      "-keyout", keyfile.name,        "-out",    crtfile.name,
      "-subj",   `/CN=${CN}/O=${CN}`
    ];

    const output = await execa.stdout("openssl", openSslParams);

    //kubectl create secret tls nginxcert --key ${NGINX_KEY} --cert ${NGINX_CRT}
    // result = await execa.stdout("kubectl", ["create", "secret", "tls", name, "--key", keyfile, "--cert", crtfile]);
    result = await _createTlsSecret_({...argv, keyfile: keyfile.name, crtfile: crtfile.name, name}, context);

  } finally {

    // Clean up the temp files
    if (crtfile && crtfile.removeCallback)    { crtfile.removeCallback(); }
    if (keyfile && keyfile.removeCallback)    { keyfile.removeCallback(); }
  }

  return result;
}});

mod.async({ensureTlsSecret: async function(argv, context ={}) {

  const namespace     = ns(argv);
  const {name}        = argv;
  const CN            = argv.CN || argv.cn;

  // TODO: exit unless we have params

  return _ensureTlsSecret_({...argv, name, CN, namespace}, context);
}});


