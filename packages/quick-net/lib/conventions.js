


const sg0                     = require('sg0');
const sg                      = sg0.merge(sg0, require('sg-env'));
const {_}                     = sg;
const os                      = require('os');
const path                    = require('path');
const fs                      = require('fs');
const libUrl                  = require('url');
const util                    = require('util');

const sshDir                  = path.join(os.homedir(), '.ssh');

var conventions = {
  // bastionSshKey :   path.join(os.homedir(), '.ssh', 'bcsnet-access.pem'),
  bastionIp           :   'bastion.cdr0.net',
  bastionSshKey       :   path.join(os.homedir(), '.ssh', 'quicknet-access.pem'),
  bastionSshTunnel    :   10022,
  workerSshKey        :   path.join(os.homedir(), '.ssh', 'mario_demo.pem'),
  adminSshKey         :   path.join(os.homedir(), '.ssh', 'HQ.pem'),
  username            :   'ubuntu',
  sshPort             :   22,
};

conventions = {...conventions,
  // server: {
  // }
};

module.exports = conventions;

