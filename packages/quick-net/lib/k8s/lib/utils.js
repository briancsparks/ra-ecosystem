
const sg                      = require('sg-clihelp');
const crypto                  = require('crypto');
const {test}                  = sg.sh;
const {KubeConfig}            = require('kubernetes-client');
const Client                  = require('kubernetes-client').Client;

const kubeconfig              = new KubeConfig();


module.exports.getKClient   = getKClient;
module.exports.sha256       = sha256;
module.exports.base64       = base64;
module.exports.ns           = ns;
module.exports.isFile       = isFile;
module.exports.isDir        = isDir;

// -------------------------------------------------------------------------------------------------------------------------------------------------------
var kClient;
function getKClient() {
  if (kClient) {
    return kClient;
  }

  kubeconfig.loadFromDefault();

  const backend  = new Request({kubeconfig});
  return kClient = new Client({backend, version: '1.13'});
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
function sha256(strlist) {
  if (!Array.isArray(strlist))  { return sha256([strlist]); }

  var   hash = crypto.createHash('sha256');
  var   data;

  for (let item of strlist) {
    data = hash.update(item, 'utf8');
  }

  return data.digest('hex');
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
function base64(str) {
  const buff = new Buffer(str);
  return buff.toString('base64');
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
function ns(argv) {
  return argv.namespace || argv.ns || 'default';
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
function isFile(argv) {
  const {file,root}    = argv;

  if (file[0] === '/' && test('-f', file)) {
    return file;
  }

  if (!root || !file)      { return; }

  const fileitem  = sg.path.join(root, file);

  if (test('-f', fileitem)) {
    return fileitem;
  }

  return;
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------
function isDir(argv) {
  const {dir,root}     = argv;

  if (dir[0] === '/' && test('-d', dir)) {
    return dir;
  }

  if (!root || !dir)       { return; }

  const fileitem  = sg.path.join(root, dir);

  if (test('-d', fileitem)) {
    return fileitem;
  }

  return;
}

