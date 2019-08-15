
const sg                      = require('sg-clihelp');
const crypto                  = require('crypto');
const {test}                  = sg.sh;


module.exports.sha256 = sha256;
module.exports.base64 = base64;
module.exports.ns     = ns;
module.exports.isFile = isFile;
module.exports.isDir  = isDir;

function sha256(strlist) {
  if (!Array.isArray(strlist))  { return sha256([strlist]); }

  var   hash = crypto.createHash('sha256');
  var   data;

  for (item of strlist) {
    data = hash.update(item, 'utf8');
  }

  return data.digest('hex');
}

function base64(str) {
  const buff = new Buffer(str);
  return buff.toString('base64');
}

function ns(argv) {
  return argv.namespace || argv.ns || 'default';
}

function isFile(argv) {
  const {file,root}    = argv;

  if (!root || !file)      { return; }

  const fileitem  = sg.path.join(root, file);

  if (test('-f', fileitem)) {
    return fileitem;
  }

  return;
}

function isDir(argv) {
  const {dir,root}     = argv;

  if (!root || !dir)       { return; }

  const fileitem  = sg.path.join(root, dir);

  if (test('-d', fileitem)) {
    return fileitem;
  }

  return;
}

