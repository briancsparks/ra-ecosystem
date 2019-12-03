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
  if (!(this instanceof Bits))  { return new Bits(mod); }
  var   self = this;

  self.pieces         = {};         /* the wrong-way-around index */
  self.json           = {};         /* the right-way-around index */
  self.jsonPiecesFile = null;
  self.currSetupName  = null;

  const [dirname, basename, ext]    = splitFilepath(mod.filename);

  self.setPieces = function(data) {
    self.currSetupName  = utils.getNameFromConfig(data) || self.currSetupName;

    // self.pieces         = qm(self.pieces, data);
    self.mergePieces(data);
  };

  /**
   * Sets data.
   *
   * setDataPieces('fnName', 'devargs', '--foo --bar');
   * setDataPieces('fnName', 'aliases', {args: {lambdaName: 'name,lambda_name'}});
   *
   * name (i.e. replacing 'fnName') can be null to use `self.currSetupName`
   *
   * @param {*} name
   * @param {*} type
   * @param {*} data
   *//**
   *
   * Sets data.
   *
   * setDataPieces('fnName', {devargs: '--foo --bar'});
   * setDataPieces('fnName', {aliases: {args: {lambdaName: 'name,lambda_name'}}});
   *
   * name (i.e. replacing 'fnName') can be null to use `self.currSetupName`
   *
   * @param {*} name
   * @param {*} data
   */
  self.setDataPieces = function(a,b,c) {

    if (arguments.length === 3) {
      return self._setDataPieces_(a,b,c);
    }

    if (arguments.length === 2) {
      var [name, data] = arguments;
      name = name || self.currSetupName;

      assert.ok(name); assert.ok(data);

      _.each(data, (datum, type) => {
        assert.ok(datum); assert.ok(type);
        return self._setDataPieces_(name, type, datum);
      });
      return;
    }

    assert.fail();
  };

  self._setDataPieces_ = function(name, type, data) {
    self.mergePieces({[type]: {[name]: data}});
  };

  self.mergePieces = function(data) {
    self.pieces         = qm(self.pieces, data);
    self.json           = null;
  };

  self.loadPiecesSync = function() {

    // We are no longer setting up
    self.currSetupName = null;

    const bitsdir                     = sg.path.join(dirname, '_sg-bits');
    const mainBitsFile                = sg.path.join(bitsdir, `${basename}.json`);

    if (!self.jsonPiecesFile) {
      try {
        self.json            = null;
        self.jsonPiecesFile  = fs.readFileSync(mainBitsFile);
        self.pieces          = qm(self.pieces, sg.safeJSONParse(self.jsonPiecesFile) || {});

      } catch(err) {
        // If theres an error, just let it fall thru (we already have self.pieces)
        // console.error(`getjson error`, err);
      }
    }

    return self.pieces;
  };

  self.loadPieces = async function() {

    // We are no longer setting up
    self.currSetupName = null;

    const bitsdir                     = sg.path.join(dirname, '_sg-bits');
    const mainBitsFile                = sg.path.join(bitsdir, `${basename}.json`);

    if (!self.jsonPiecesFile) {
      try {
        self.json           = null;
        self.jsonPiecesFile = await fs_readFile(mainBitsFile);
        self.pieces         = qm(self.pieces, sg.safeJSONParse(self.jsonPiecesFile) || {});

      } catch(err) {
        // If theres an error, just let it fall thru (we already have self.pieces)
        // console.error(`getjson error`, err);
      }
    }

    return self.pieces;
  };

  self.loadJson = async function() {

    const bitsdir          = sg.path.join(dirname, '_sg-bits');
    const mainBitsFile     = sg.path.join(bitsdir, `${basename}-json.json`);

    try {
      const json           = self.getJson();
      const jsonFile       = await fs_readFile(mainBitsFile);
      self.json            = qm(json, sg.safeJSONParse(jsonFile) || {});
      self.pieces          = self.getOtherWayAround(self.json);

    } catch(err) {
      // If theres an error, just let it fall thru (we already have self.pieces)
      // console.error(`getjson error`, err);
    }

    return self.pieces;
  };

  self.loadJsonSync = function() {

    const bitsdir          = sg.path.join(dirname, '_sg-bits');
    const mainBitsFile     = sg.path.join(bitsdir, `${basename}-json.json`);

    try {
      const json           = self.getJson();
      const jsonFile       = fs.readFileSync(mainBitsFile);
      self.json            = qm(json, sg.safeJSONParse(jsonFile) || {});
      self.pieces          = self.getOtherWayAround(self.json);

    } catch(err) {
      // If theres an error, just let it fall thru (we already have self.pieces)
      // console.error(`getjson error`, err);
    }

    return self.pieces;
  };

  self.getOtherWayAround = function(x) {
    var otherWayAround = {};

    var keys0 = Object.keys(x);
    for (let i = 0; i < keys0.length; ++i) {
      let key0  = keys0[i];
      var obj1  = x[key0];
      var keys1 = Object.keys(obj1);
      for (let j = 0; j < keys1.length; ++j) {
        let key1  = keys1[j];
        var obj2  = obj1[key1];

        otherWayAround[key1]        = otherWayAround[key1] || {};
        otherWayAround[key1][key0]  = obj2;
      }
    }

    return otherWayAround;
  };

  self.getJson = function() {
    self.json = self.json || self.getOtherWayAround(self.pieces);
    return self.json;
  };

  self.getJsonData = function(name, aspectKey) {
    const name_   = name || self.currSetupName;
    const json    = self.getJson();

    return name_ && aspectKey && json && json[name_] && json[name_][aspectKey];
  };

  self.getPieces = function() {
    return self.pieces;
  };

  self.getPiecesData = function(name, aspectKey) {
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
