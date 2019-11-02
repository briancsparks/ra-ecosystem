/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const assert                  = require('assert').strict;
var   sg                      = require('sg0');
const { _ }                   = sg;
const { qm }                  = require('quick-merge');
const fs                      = require('fs');
const utils                   = require('./lib/utils');

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

  self.pieces         = {};
  self.jsonFile       = null;
  self.currSetupName  = null;

  const [dirname, basename, ext]    = splitFilepath(mod.filename);
  const bitsdir                     = sg.path.join(dirname, '_sg-bits');
  const mainBitsFile                = sg.path.join(bitsdir, `${basename}.json`);

  self.setJson = function(data) {
    self.currSetupName  = utils.getNameFromConfig(data) || self.currSetupName;

    // self.pieces         = qm(self.pieces, data);
    self.mergeJson(data);
  };

  /**
   * Sets data.
   *
   * setData('fnName', 'devargs', '--foo --bar');
   * setData('fnName', 'aliases', {args: {lambdaName: 'name,lambda_name'}});
   *
   * name can be null to use `self.currSetupName`
   *
   * @param {*} name
   * @param {*} type
   * @param {*} data
   *//**
   *
   * Sets data.
   *
   * setData('fnName', {devargs: '--foo --bar'});
   * setData('fnName', {aliases: {args: {lambdaName: 'name,lambda_name'}}});
   *
   * name can be null to use `self.currSetupName`
   *
   * @param {*} name
   * @param {*} data
   */
  self.setData = function(a,b,c) {

    if (arguments.length === 3) {
      return self._setData_(a,b,c);
    }

    if (arguments.length === 2) {
      var [name, data] = arguments;
      name = name || self.currSetupName;

      assert.ok(name); assert.ok(data);

      _.each(data, (datum, type) => {
        assert.ok(datum); assert.ok(type);
        return self._setData_(name, type, datum);
      });
      return;
    }

    assert.fail();
  };

  self._setData_ = function(name, type, data) {
    self.mergeJson({[type]: {[name]: data}});
  };

  self.mergeJson = function(data) {
    self.pieces         = qm(self.pieces, data);
  };

  self.loadJson = async function() {

    // We are no longer setting up
    self.currSetupName = null;

    if (!self.jsonFile) {
      try {
        self.jsonFile = await fs_readFile(mainBitsFile);
        self.pieces   = qm(self.pieces, sg.safeJSONParse(self.jsonFile) || {});

      } catch(err) {
        // If theres an error, just let it fall thru (we already have self.pieces)
        // console.error(`getjson error`, err);
      }
    }

    return self.pieces;
  };

  self.loadJsonSync = function() {

    // We are no longer setting up
    self.currSetupName = null;

    if (!self.jsonFile) {
      try {
        self.jsonFile = fs.readFileSync(mainBitsFile);
        self.pieces   = qm(self.pieces, sg.safeJSONParse(self.jsonFile) || {});

      } catch(err) {
        // If theres an error, just let it fall thru (we already have self.pieces)
        // console.error(`getjson error`, err);
      }
    }

    return self.pieces;
  };

  self.getJson = function() {
    return self.pieces;
  };

  self.getData = function(name, aspectKey) {
    const aspect  = self.pieces[aspectKey];
    const name_   = name || self.currSetupName;

    return name_ && aspect && aspect[name_];
  };
}


function splitFilepath(f) {
  const parts       = f.split(sg.path.sep);
  const filename    = parts.pop();
  const dirname     = joinFilepath(...parts);

  const fileparts   = filename.split('.');
  const ext         = fileparts.pop();
  const basename    = fileparts.join('.');

  return [dirname, basename, ext];
}

function joinFilepath(...parts) {
  var path = '';
  if (!parts[0]) {
    path += sg.path.sep;
  }

  path += sg.path.join(...parts);

  return path;
}
