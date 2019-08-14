
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg0;
const qm                      = require('quick-merge').qm;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
const nginxConfig             = require('../../webtier/nginx-config');
const Kutils                  = require('./utils');
const os                      = require('os');
const k8s                     = require('@kubernetes/client-node');
const {KubeConfig}            = require('kubernetes-client');
const Request                 = require('kubernetes-client/backends/request');
const Client                  = require('kubernetes-client').Client;
const pem                     = require('pem');
const util                    = require('util');
const {execz,execa}           = sg;
const {test}                  = sg.sh;
const kubeconfig              = new KubeConfig();

const mod                     = ra.modSquad(module, 'configMap');

kubeconfig.loadFromDefault();
const backend                 = new Request({kubeconfig});
const client                  = new Client({backend, version: '1.13'});

const {ns,isFile,isDir,sha256}       = Kutils;

const serverAndUpstream       = nginxConfig.async.serverAndUpstream;

sg.ARGV();
var   addToConfigMap;


// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 *  Adds a route for the service.
 *
 */
mod.async({addServiceRoute: async function(argv, context ={}) {

  const namespace     = ns(argv);
  const root          = argv.cwd || argv.root || process.cwd();
  const configMapDir  = isDir({root, ...argv});
  const name          = argv.name;

  const {service, stage, server_name, port} = argv;

  var   nginxconfig   = await serverAndUpstream(argv, context);

  var   result        = await addToConfigMap({...argv, configItems: nginxconfig}, context);

  return result;
}});

// -------------------------------------------------------------------------------------------------------------------------------------------------------
var   _addToConfigMap_;
addToConfigMap = mod.async({addToConfigMap: async function(argv, context ={}) {

  const namespace     = ns(argv);
  const root          = argv.cwd || argv.root || process.cwd();
  const configMapDir  = isDir({root, ...argv});
  const name          = argv.name;

  // TODO: exit if we don't have params
  // console.log(`ccm`, {argv,context,namespace,root,configMapDir,name});

  return _addToConfigMap_({...argv, namespace, configMapDir, name}, context);
}});

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Add items to the configmap
 *
 *
 *
 */
_addToConfigMap_ = mod.async({_addToConfigMap_: async function(argv, context ={}) {
  var result = {};

  const {namespace,configMapDir,name,configItems} = argv;

  // ---------- Get the configmap to change ----------

  var   configmap;
  const hasConfigMap = await getHasConfigmap(namespace, name);

  // Get the configmap from the API, or...
  if (hasConfigMap) {
    configmap = await client.api.v1.namespace(namespace).configmap(name).get();
    configmap = configmap.body || {};

  } else {
    // ...get the configmap from our seed dir
    let fromfile  = await execa.stdout('kubectl', ['create', 'configmap', name, `--from-file=${configMapDir}`, '-o', 'json', '--dry-run']);
    configmap     = sg.safeJSONParse(fromfile);
  }

  // Make sure we have something
  configmap = configmap || {metadata:{name}, data:{}};

  // ---------- Add / replace the item(s) ----------

  // Make everything a string, compute hash
  var   configmapData = mergeConfigMap(configmap.data || {}, configItems);

  // The body to send to the API
  var   body = {
    metadata: {name},
    data: configmapData,
  };

  // Put data back to k8s
  if (hasConfigMap) {
    result = await client.api.v1.namespace(namespace).configmaps(name).put({body});
  } else {
    result = await client.api.v1.namespace(namespace).configmap.post({body});
  }

  return result;
}});



// -------------------------------------------------------------------------------------------------------------------------------------------------------
var   _createConfigMap_;
mod.async({createConfigMap: async function(argv, context ={}) {

  const namespace     = ns(argv);
  const root          = argv.cwd || argv.root || process.cwd();
  const configMapDir  = isDir({root, ...argv});
  const name          = argv.name;

  // TODO: exit if we don't have params
  // console.log(`ccm`, {argv,context,namespace,root,configMapDir,name});

  return await _createConfigMap_({...argv, namespace, configMapDir, name}, context);
}});

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 *  Puts a configmap into the configuration from a directory.
 *
 *
 *
 */
_createConfigMap_ = mod.async({_createConfigMap_: async function(argv, context ={}) {
  var result = {};

  try {
    const {namespace,configMapDir,name} = argv;

    // Get the config from the dir
    result              = await execa.stdout('kubectl', ['create', 'configmap', name, `--from-file=${configMapDir}`, '-o', 'json', '--dry-run']);
    const configmap     = sg.safeJSONParse(result);
    const data          = mergeConfigMap(configmap.data || {});

    if (await getHasConfigmap(namespace, name)) {
      result = await client.api.v1.namespace(namespace).configmaps(name).put({body: {...configmap, data}});
    } else {
      result = await client.api.v1.namespace(namespace).configmap.post({body: {...configmap, data}});
    }

  } catch(err) {
    throw err;
  }

  return result;
}});







// -------------------------------------------------------------------------------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 *  Merges the config map, and computes the sha256, putting that into a config file `hash`
 *
 *
 * @param {Object} configmap -- The already-existing configmap
 * @param {Object} items     -- The new items for the configmap
 *
 * @returns {Object}         -- The new full configmap
 *
 */
function mergeConfigMap(configmap_, items ={}) {
  var   configmap = sg.reduce(items, _.omit(configmap_, 'hash'), (m, contents, name) => {
    return sg.kv(m, name, stringify(contents));
  });

  const hash = sha256(_.values(configmap));

  return {...configmap, hash};
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Turn the input into a string.
 */
function stringify(x) {
  if (sg.isnt(x))         { return x; }
  if (_.isString(x))      { return x; }
  if (sg.isObject(x))     { return JSON.stringify(x); }
  if (Array.isArray(x))   { return JSON.stringify(x); }

  return ''+x;
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Do we already have a configmap?
 *
 * @param {string} namespace -- The namespace.
 * @param {string} name      -- The name of the configmap.
 */
async function getHasConfigmap(namespace, name) {
  const configmaps  = await client.api.v1.namespace(namespace).configmaps.get();

  if (!configmaps || configmaps.statusCode >= 400)  { return false; }

  const matching = (sg.deref(configmaps, 'body.items') || []).filter(cmap => cmap.metadata.name === name);
  return matching.length > 0;
}


