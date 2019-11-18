
/**
 * @file
 */

//const ra                      = require('run-anywhere').v2;
//const sg0                     = ra.get3rdPartyLib('sg-argv');
//const { _ }                   = sg0;
//const qm                      = require('quick-merge').qm;
//const sg                      = sg0.merge(sg0, require('sg-exec'), require('sg-clihelp'));
//const nginxConfig             = require('../../webtier/nginx-config');
//const Kutils                  = require('./utils');
//const os                      = require('os');
const k8s                     = require('@kubernetes/client-node');
const {KubeConfig}            = require('kubernetes-client');
const Request                 = require('kubernetes-client/backends/request');
const Client                  = require('kubernetes-client').Client;
//const pem                     = require('pem');
//const util                    = require('util');
//const {execz,execa}           = sg;
//const {test}                  = sg.sh;
const kubeconfig              = new KubeConfig();

//const mod                     = ra.modSquad(module, 'configMap');

kubeconfig.loadFromDefault();
// const backend                 = new Request({kubeconfig});
// const client                  = new Client({backend, version: '1.13'});

// exports.kclient               = client;
// exports.kubeconfig            = kubeconfig;

