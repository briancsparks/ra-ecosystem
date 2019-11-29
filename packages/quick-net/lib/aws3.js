/* eslint-disable valid-jsdoc */

/**
 * Parse AWS objects.
 *
 * For instances, adds: {
 *  tags: { ... },                     // Normal JS objects with kv pairs that are easy to use in JS
 *  tag_qn_roles= ":access:bastion:",
 *  tag_qn_roles__access = true,
 *  tag_qn_roles__bastion = true
 *  instanceId
 *  id
 *  monitoring
 *  zone
 *  state
 *  iamInstanceProfile
 * }
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

module.exports.AwsDataBlob      = AwsDataBlob;
module.exports.normalizeItems   = normalizeItems;

//-----------------------------------------------------------------------------------------------------------------------------
function normalizeItems(items) {
  const blob = new AwsDataBlob(items);
  return blob.getData();
}

//-----------------------------------------------------------------------------------------------------------------------------
function AwsDataBlob(blob) {
  if (!(this instanceof AwsDataBlob))   { return new AwsDataBlob(blob);  }
  var self = this;

  self.data = {};

  if (blob) {
    self.addResult(blob);
  }
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

  // TODO: This is not right (using firstKey). The blob is not guaranteed only to
  // have one key

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

    return self.addResult({Instances: instanceList});
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

  if (item.InstanceId) {
    item.instanceId         = item.InstanceId;
    item.id                 = item.InstanceId;
    item.monitoring         = item.Monitoring           && item.Monitoring.State;
    item.zone               = item.Placement            && item.Placement.AvailabilityZone;
    item.state              = item.State                && item.State.Name;
    item.iamInstanceProfile = item.IamInstanceProfile   && _.last(((item.IamInstanceProfile.Arn ||"").split('/') ||[]));
    // item.sgName             = item.SecurityGroups
  }

  return item;
};

//-----------------------------------------------------------------------------------------------------------------------------
function mkTagMap(v) {
  var key = v.Key.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');

  var result = sg.kv({}, `tag_${key}`, v.Value);

  const arr = sg.compact(v.Value.split(':'));
  result = sg.reduce(arr, result, (m,v) => {
    return sg.kv(m, `tag_${key}__${v}`.replace(/[^a-zA-Z0-9_]/g, '_'), true);
  });

  return result;
}


