
const utils                   = require('./utils');

const region      = 'us-east-1';
var   sslEnabled=true, httpOptions={};

if (process.env.NETWORK_WITH_WIFI !== 'net10') {
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    sslEnabled  = false;
    httpOptions = {proxy: 'http://web-proxy.corp.hp.com:8088'};
  }
}

const localIp     = utils.localIp();

var   defs        = { region };
if (localIp.startsWith('15')) {
  defs = { ...defs, sslEnabled, httpOptions };
}

exports.options = defs;

// console.log({options:exports.options});
