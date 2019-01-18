
const utils                   = require('./utils');

const region      = 'us-east-1';
const sslEnabled  = false;
const httpOptions = {proxy: 'http://web-proxy.corp.hp.com:8088'};

const localIp     = utils.localIp();

var   defs        = { region };

if (localIp.startsWith('15')) {
  defs = { ...defs, sslEnabled, httpOptions };
}

exports.options = defs;

// console.log({options:exports.options});
