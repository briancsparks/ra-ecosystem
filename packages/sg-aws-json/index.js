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

const sg                      = require('sg0');
const {_}                     = sg;
const quickMerge              = require('quick-merge');
// const DIAG                    = sg.DIAG(module);

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
  var   index = {
    by : {
      PublicIpAddress: {},
      PrivateIpAddress: {},
      realm: {},
      vpc: {},
      zone:{},
      uniqueName:{},
      name: {},
      role:{},
      fqdn: {},
    }
  };

  this.data.Instances.forEach(instance => {
    sg.setOn(index.by.PublicIpAddress,   [instance.PublicIpAddress],   instance);
    sg.setOn(index.by.PrivateIpAddress,  [instance.PrivateIpAddress],  instance);

    sg.setOna(index.by.realm,            [instance.tag_realm],         instance);
    sg.setOna(index.by.vpc,              [instance.vpcId],             instance);
    sg.setOna(index.by.zone,             [instance.zone],              instance);
    sg.setOn(index.by.uniqueName,        [instance.tag_qn_uniquename], instance);
    sg.setOn(index.by.name,              [instance.tag_name],          instance);

    // many
    sg.compact((instance.tag_qn_roles ||'').split(':')).forEach(role => {
      sg.setOna(index.by.role, [role],  instance);
    });

    sg.compact((instance.tag_qn_fqdns ||'').split(',')).forEach(fqdn => {
      sg.setOna(index.by.fqdn, [fqdn],  instance);
    });
  });

  return {...this.data, index};
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
    // TODO: do not assume it is an instance list
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
    item.subnetId           = item.SubnetId;
    item.vpcId              = item.VpcId;
    item.monitoring         = item.Monitoring           && item.Monitoring.State;
    item.zone               = item.Placement            && item.Placement.AvailabilityZone;
    item.state              = item.State                && item.State.Name;
    item.iamInstanceProfile = item.IamInstanceProfile   && _.last(((item.IamInstanceProfile.Arn ||"").split('/') ||[]));
    // item.sgName             = item.SecurityGroups

  } else if (item.GroupId) {
    item.groupId            = item.GroupId;
    item.id                 = item.GroupId;

  } else if (item.SubnetId && item.SubnetArn) {
    item.subnetId           = item.SubnetId;
    item.id                 = item.SubnetId;
    item.public             = item.MapPublicIpOnLaunch;
    item.state              = item.State;
    // TODO: zoneLetter, first IP, last IP

  } else if (item.TableId && item.TableArn) {     /* does not arrive as array */
    item.tableId            = item.TableId;
    item.id                 = item.TableId;
    item.name               = item.TableName;
    item.status             = item.TableStatus;

  } else if (item.VpcEndpointId) {
    item.vpcEndpointId      = item.VpcEndpointId;
    item.id                 = item.VpcEndpointId;

  } else if (item.VpcId) {
    item.vpcId              = item.VpcId;
    item.id                 = item.VpcId;
    item.state              = item.State;
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


