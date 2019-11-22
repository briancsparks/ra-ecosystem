/* eslint-disable valid-jsdoc */

/**
 * Parse AWS objects.
 *
 *
 */

const sg0                     = require('sg-diag');
const sg                      = sg0.merge(sg0);
const {_}                     = sg;
const quickMerge              = require('quick-merge');
const DIAG                    = sg0.DIAG(module);

const qm                      = quickMerge.quickMergeImmutable;

// const ARGV                    = sg.ARGV();
// const ENV                     = sg.ENV();
// const dg                      = DIAG.dg;

module.exports.AwsDataBlob = AwsDataBlob;


//-----------------------------------------------------------------------------------------------------------------------------
function AwsDataBlob() {
  if (!(this instanceof AwsDataBlob))   { return new AwsDataBlob();  }
  var self = this;

  self.data = {};
}

//-----------------------------------------------------------------------------------------------------------------------------
AwsDataBlob.prototype.getData = function() {
  return this.data;
};


//-----------------------------------------------------------------------------------------------------------------------------
AwsDataBlob.prototype.addResult = function(blob) {
  var self = this;

  self.data = self.data || [];

  if (typeof blob === 'string') {
    blob = sg.safeJSONParse(blob) || {__just__: blob};
  }

  if (blob.Reservations) {
    return outerParse(blob);
  }

  var key     = sg.firstKey(blob);
  var value   = blob[key];

  if (Array.isArray(value)) {
    value = value.map(v => this.normalize(v));
  }

  // this.data = qm(this.data, {[key]: _.groupBy(value, 'InstanceId')});
  this.data = qm(this.data, {[key]: value});

  return this.data;


  function outerParse(outerBlob) {
    var instanceListList = outerBlob.Reservations.map(r => r.Instances);
    var instanceList     = instanceListList.reduce(function(m, iList) {
      return [...m, ...iList];
    }, []);

    return self.parse({Instances: instanceList});
  }
};

//-----------------------------------------------------------------------------------------------------------------------------
AwsDataBlob.prototype.normalize = function(item_) {
  var item = {...item_};

  if (item.Tags) {
    item.tags = sg.reduce(item.Tags, {}, (m,v) => {
      item = {...item, ...mkTagMap(v)};

      // item[`tag_${v.Key.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_')}`] = v.Value;
      return sg.kv(m, v.Key, v.Value);
    });
  }

  return item;
};

//-----------------------------------------------------------------------------------------------------------------------------
function mkTagMap(v) {
  var key = v.Key.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');

  var result = sg.kv({}, `tag_${key}`, v.Value);

  const arr = sg.compact(v.Value.split(':'));
  result = sg.reduce(arr, result, (m,v) => {
    return sg.kv(m, `tag_${key}__${v}`, true);
  });

  return result;
}


