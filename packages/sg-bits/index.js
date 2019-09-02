
var   sg                      = require('sg0');
const { _ }                   = sg;
const { qm }                  = require('quick-merge');
const fs                      = require('fs');

sg.path                       = require('path');
sg.os                         = require('os');

const fs_stat                 = sg.libs.util.promisify(fs.stat);
const fs_access               = sg.libs.util.promisify(fs.access);
const fs_mkDir                = sg.libs.util.promisify(fs.mkdir);
const fs_readFile             = sg.libs.util.promisify(fs.readFile);


module.exports.Bits =  Bits;
module.exports.bits =  bits;


function bits(...args) {
  return new Bits(...args);
}

function Bits(mod) {
  var   self = this;

  self.pieces = {};

  const [dirname, basename, ext]    = splitFilepath(mod.filename);
  const bitsdir                     = sg.path.join(dirname, '_sg-bits');
  const mainfile                    = sg.path.join(bitsdir, `${basename}.json`);

  self.setJson = function(data) {
    self.pieces = qm(self.pieces, data);
  };

  self.loadJson = async function() {

    var   result = self.pieces || {};

    var   subPieces = {};
    try {
      subPieces     = await fs_readFile(mainfile);
      self.pieces   = sg.extend(self.pieces, sg.safeJSONParse(subPieces) || {});

    } catch(err) {
      // If theres an error, just let it fall thru (we already have self.pieces)
      console.error(`getjson error`, err);
    }

    return self.pieces;
  };

  self.getJson = function() {
    return self.pieces;
  };
}


function splitFilepath(f) {
  const parts       = f.split(sg.path.sep);
  const filename    = parts.pop();
  const dirname     = sg.path.join(...parts);
  const fileparts   = filename.split('.');
  const ext         = fileparts.pop();
  const basename    = fileparts.join('.');

  return [dirname, basename, ext];
}
