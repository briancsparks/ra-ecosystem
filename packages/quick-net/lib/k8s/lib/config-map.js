
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
const Request                 = require('kubernetes-client/backends/request');
const Client                  = require('kubernetes-client').Client;
const pem                     = require('pem');
const util                    = require('util');
const {execz,execa}           = sg;
const {test}                  = sg.sh;

const mod                     = ra.modSquad(module, 'configMap');

const backend                 = new Request(Request.config.fromKubeconfig(`${os.homedir()}/.kube/config`));
const client                  = new Client({backend, version: '1.13'});

const {ns,isFile,isDir}       = Kutils;

sg.ARGV();

const _createConfigMap_ = mod.async({_createConfigMap_: async function(argv, context ={}) {
  var result = {};

  // You can get the file back out of config-space:
  // get configmaps $name -o json | jq -r '.data["default.conf"]'

  try {
    const {namespace,fileitem,name} = argv;

    result        = await execa.stdout('kubectl', ['create', 'configmap', name, `--from-file=${fileitem}`, '-o', 'json', '--dry-run']);
    const json    = sg.safeJSONParse(result);

    var currentConfigMap;
    try {
      currentConfigMap = await client.api.v1.namespace(namespace).configmap(name).get();
    } catch(err) {
    }

    if (currentConfigMap) {
      result = await client.api.v1.namespace(namespace).configmaps(name).put({body: json});
    } else {
      result = await client.api.v1.namespace(namespace).configmap.post({body: json});
    }

  } catch(err) {
    throw err;
  }

  return result;
}});

mod.async({createConfigMap: async function(argv, context ={}) {

  const namespace     = ns(argv);
  const root          = argv.cwd || argv.root || process.cwd();
  const fileitem      = isDir({root, ...argv});
  const name          = argv.name;

  // TODO: exit if we don't have params
  // console.log(`ccm`, {argv,context,namespace,root,fileitem,name});

  return _createConfigMap_({...argv, namespace, fileitem, name}, context);
}});
