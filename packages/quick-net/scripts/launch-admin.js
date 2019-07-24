
/**
 * Launch a one-instance Mongo-DB
 */

const quickNet                = require('quick-net');
const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'));
const fs                      = require('fs');
const path                    = require('path');
const os                      = require('os');

const ARGV                    = sg.ARGV();

const az                      = ARGV._get('az,zone')            || 'c';


var   params = {
  distro        : 'ubuntu',
  sgs           : ['admin'],
  subnet        : `admin-zone${az.toUpperCase()}`,
  InstanceType  : 't3.medium',
  az
};

params.userdata_opts = {INSTALL_DOCKER:true, INSTALL_OPS:true, INSTALL_AGENTS:true, INSTALL_KUBERNETES:true, MONGO_CLIENTS:true};

params = moreShellScript(params);
sg.elog(`params`, {params});

ra.command(ARGV._plus(params), {quickNet}, 'upsertInstance', {__filename});




function moreShellScript(params) {
//   const key           = fs.readFileSync(path.join(os.homedir(), '.ssh', 'mario-build-user-id_rsa'), 'utf8');
//   params.roleKeys     = [{
//     user: 'ubuntu',
//     key,
//     role: 'mario-build-user-id_rsa'
//   }];

//   params.moreshellscript = `
// export HOME=/home/ubuntu

// mkdir -p /home/ubuntu/.ssh

// cat << EOF > /home/ubuntu/.ssh/mario-build-user-id_rsa
// ${key}
// EOF

// chown -R ubuntu:ubuntu $HOME/.ssh
// chmod 0400 /home/ubuntu/.ssh/mario-build-user-id_rsa

// `;

  return params;
}




