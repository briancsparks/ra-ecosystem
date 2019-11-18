
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg0;
const qm                      = require('quick-merge').qm;
const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
const nginxConfigLib          = require('../../webtier/nginx-config');
const Kutils                  = require('./utils');
const os                      = require('os');
const k8s                     = require('@kubernetes/client-node');
const {KubeConfig}            = require('kubernetes-client');
const Request                 = require('kubernetes-client/backends/request');
const Client                  = require('kubernetes-client').Client;
const pem                     = require('pem');
const util                    = require('util');
const libAws                  = require('../../aws');
const {execz,execa}           = sg;
const {test}                  = sg.sh;
const kubeconfig              = new KubeConfig();
const route53                 = libAws.awsService('Route53');


const mod                     = ra.modSquad(module, 'configMap');

const {ns,isFile,isDir,sha256}       = Kutils;

const serverAndUpstreamBlocks = nginxConfigLib.async.serverAndUpstreamBlocks;
const serverBlock             = nginxConfigLib.async.serverBlock;
const upstreamBlock           = nginxConfigLib.async.upstreamBlock;

const ARGV                    = sg.ARGV();
var   addToConfigMap;


// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 *  Adds a route for the service.
 *
 *  To make a cert, see scripts/certbot*.
 *
 *  This will put certs into ~/.quick-net/certs/live/api.example.com/*.pem
 *
 *  To put a cert into a deployment (and note `nginxcert-4`):
 *
 *    kubectl create  secret tls nginxcert-4 \
 *        --key ~/.quick-net/certs/live/api.example.com/privkey.pem \
 *        --cert ~/.quick-net/certs/live/api.example.com/fullchain.pem \
 *        -o json --dry-run | kubectl replace -f -`
 */
mod.async({addServiceRoute: async function(argv, context ={}) {
  ARGV.v(`addServiceRoute`, {argv});

  const namespace     = ns(argv);
  const root          = argv.cwd || argv.root || process.cwd();
  const config_name   = argv.config_name;

  const {service, stage, server_name, server_num, port} = argv;

  var   serverconfig  = await serverAndUpstreamBlocks(argv, context);

  var   result        = await addToConfigMap({...argv, configItems: {...serverconfig}}, context);

  // ---------- Register LB as our subdomain ----------
  const ingressService  = await Kutils.getKClient().api.v1.namespace(namespace).service('nginx-ingress').get();
  const lbHostName      = sg.deref(ingressService, 'body.status.loadBalancer.ingress')[0].hostname;
  const ChangeBatch     = changeBatch('UPSERT', server_name, lbHostName);

  const domainName = sg.last(server_name.split('.'), 2).join('.');
  await updateDomainName(domainName, ChangeBatch, server_name, lbHostName);

  return result;
}});

// -------------------------------------------------------------------------------------------------------------------------------------------------------
var   _addToConfigMap_;
addToConfigMap = mod.async({addToConfigMap: async function(argv, context ={}) {
  ARGV.v(`addToConfigMap`, {argv});

  const namespace     = ns(argv);
  const root          = argv.cwd || argv.root || process.cwd();
  const configMapDir  = isDir({root, ...argv});
  const config_name   = argv.config_name;

  // TODO: exit if we don't have params
  // console.log(`ccm`, {argv,context,namespace,root,configMapDir,config_name});

  return _addToConfigMap_({...argv, namespace, configMapDir, config_name}, context);
}});

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Add items to the configmap
 *
 *
 *
 */
_addToConfigMap_ = mod.async({_addToConfigMap_: async function(argv, context ={}) {
  ARGV.v(`_addToConfigMap_`, {argv});
  var result = {};

  const {namespace,configMapDir,config_name,configItems,server_num} = argv;

  // ---------- Get the configmap to change ----------

  var   configmap;
  const hasConfigMap = await getHasConfigmap(namespace, config_name);

  // Get the configmap from the API, or...
  if (hasConfigMap) {
    configmap = await Kutils.getKClient().api.v1.namespace(namespace).configmap(config_name).get();
    configmap = configmap.body || {};

  } else {
    // ...get the configmap from our seed dir
    let fromfile  = await execa.stdout('kubectl', ['create', 'configmap', config_name, `--from-file=${configMapDir}`, '-o', 'json', '--dry-run']);
    configmap     = sg.safeJSONParse(fromfile);
  }

  // Make sure we have something
  configmap = configmap || {metadata:{name: config_name}, data:{}};

  // ---------- Add / replace the item(s) ----------

  // Make everything a string, compute hash
  var   configmapData = mergeConfigMap(configmap.data || {}, configItems);

  // The body to send to the API
  var   body = {
    metadata: {name: config_name},
    data: configmapData,
  };

  // Put data back to k8s
  if (hasConfigMap) {
    result = await Kutils.getKClient().api.v1.namespace(namespace).configmaps(config_name).put({body});
  } else {
    result = await Kutils.getKClient().api.v1.namespace(namespace).configmap.post({body});
  }

  return result;
}});



// -------------------------------------------------------------------------------------------------------------------------------------------------------
var   _createConfigMap_;
mod.async({createConfigMap: async function(argv, context ={}) {

  const namespace     = ns(argv);
  const root          = argv.cwd || argv.root || process.cwd();
  const configMapDir  = isDir({root, ...argv});
  const config_name   = argv.config_name;

  // TODO: exit if we don't have params
  // console.log(`ccm`, {argv,context,namespace,root,configMapDir,config_name});

  return await _createConfigMap_({...argv, namespace, configMapDir, config_name}, context);
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
    const {namespace,configMapDir,config_name} = argv;

    // Get the config from the dir
    result              = await execa.stdout('kubectl', ['create', 'configmap', config_name, `--from-file=${configMapDir}`, '-o', 'json', '--dry-run']);
    const configmap     = sg.safeJSONParse(result);
    const data          = mergeConfigMap(configmap.data || {});

    if (await getHasConfigmap(namespace, config_name)) {
      result = await Kutils.getKClient().api.v1.namespace(namespace).configmaps(config_name).put({body: {...configmap, data}});
    } else {
      result = await Kutils.getKClient().api.v1.namespace(namespace).configmap.post({body: {...configmap, data}});
    }

  } catch(err) {
    throw err;
  }

  return result;
}});







// -------------------------------------------------------------------------------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------------------------------------------------------------------------------

// // -------------------------------------------------------------------------------------------------------------------------------------------------------
// var kClient;
// function getKClient() {
//   if (kClient) {
//     return kClient;
//   }

//   kubeconfig.loadFromDefault();

//   const backend  = new Request({kubeconfig});
//   return kClient = new Client({backend, version: '1.13'});
// }

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 *  Merges the config map, and computes the sha256, putting that into a config file `hash`
 *
 *
 * @param {Object} configmap_ -- The already-existing configmap
 * @param {Object} items      -- The new items for the configmap
 *
 * @returns {Object}          -- The new full configmap
 *
 */
function mergeConfigMap(configmap_, items ={}) {
  var   configmap = sg.reduce(items, _.omit(configmap_, 'hash'), (m, contents_, name) => {
    const contents = contents_.lines || contents_;
    return sg.kv(m, name, stringify(contents));
  });

  const hash = sha256(_.values(configmap));

  return {...configmap, hash};
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Turn the input into a string.
 *
 * @param {*} x -- The thing to turn into a string.
 * @returns {string} The string.
 *
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
  const configmaps  = await Kutils.getKClient().api.v1.namespace(namespace).configmaps.get();

  if (!configmaps || configmaps.statusCode >= 400)  { return false; }

  const matching = (sg.deref(configmaps, 'body.items') || []).filter(cmap => cmap.metadata.name === name);
  return matching.length > 0;
}

/**
 * Updates a DNS entry.
 *
 * @param {string} domain       -- The domain name to add the sub-domain to.
 * @param {Object} ChangeBatch  -- The ChangeBatch info.
 * @param {string} server_name  -- The name.
 * @param {Object} Value        -- The value.
 */
async function updateDomainName(domain, ChangeBatch, server_name, Value) {

  // TODO: First, check if it is already correct

  const {HostedZones} = await route53.listHostedZonesByName({DNSName: domain}).promise();

  for (let i = 0; i < HostedZones.length; ++i) {
    const zone = HostedZones[i];
    if (zone.Name === `${domain}.`) {
      const HostedZoneId = zone.Id;

      ARGV.v(`Updating domain name for HostedZone ${HostedZoneId}`, {ChangeBatch});

      // See if we already have pushed this entry to route53
      const {ResourceRecordSets} = await route53.listResourceRecordSets({HostedZoneId}).promise();
      for (let j = 0; j < ResourceRecordSets.length; ++j) {
        let rr = ResourceRecordSets[j];
        if (rr.Name === `${server_name}.`) {
          for (let k = 0; k < rr.ResourceRecords.length; ++k) {
            let record = rr.ResourceRecords[k];
            if (record.Value === Value) {

              // Already done
              ARGV.d(`Updates for zone already done ${HostedZoneId}`, {record});
              return;
            }
          }
        }
      }

      const {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();

      ARGV.d(`Waiting for recordset to propigate (${server_name})`);
      const result = await route53.waitFor('resourceRecordSetsChanged', {Id: ChangeInfo.Id}).promise();
      ARGV.d(`Done waiting`);
     }
  }

}

function changeBatch(action, server_name, Value) {
  return {
    Changes: [{
      Action: action,
      ResourceRecordSet: {
        Name: server_name,
        ResourceRecords: [{Value}],
        TTL: 30,
        Type: "CNAME"
      }
    }],
  };
}


