
const sg                      = require('sg0');
const _                       = sg._;
const os                      = require('os');

exports.getTag = function(obj = {}, tagName) {
  const tags = obj.Tags;
  if (!tags)                { return; }

  return sg.reduce(tags, '', (m, tag) => {
    if (tag.Key.toLowerCase() === tagName.toLowerCase()) {
      return tag.Value;
    }
    return m;
  });
};

exports.localIp = function() {
  const init = {key:'', score:-1};

  const osIfacess = os.networkInterfaces();
  var result = sg.reduce(osIfacess, init, (m, ifaces, key) => {
    var score = 10;
    if (ifaces.length > 2)    { score -= 1; }

    const byFamily = _.groupBy(ifaces, 'family');
    if (byFamily.IPv4) {
      let ifaces_ = byFamily.IPv4 || [];
      let iface   = ifaces_[0]     || {};

      if (ifaces_.length !== 1)                     { score -= 1; }
      if ((iface.cidr || '').startsWith('172'))     { score -= 1; }
      if ((iface.cidr || '').startsWith('127'))     { score -= 1; }
      if (!(iface.cidr || '').endsWith('/24'))      { score -= 1; }

      if ((iface.cidr || '').startsWith('15'))      { score += 3; }

      if (iface.internal)                           { score -= 5; }
    } else {
      score -= 1;
    }

    if (byFamily.IPv6 && byFamily.IPv6.length > 1)  { score -= 1; }

    if (key.match(/\([^)]*\)/))                     { score -= 1; }
    if (key.match(/nat/i))                          { score -= 1; }

    let val = {key, score, byFamily};

    // console.log(sg.inspect({val, key, ifaces, byFamily}));

    if (val.score > m.score) {
      return val;
    }

    return m;
  });

  let ifaceList = osIfacess[result.key];
  let iface     = ((result.byFamily || {}).IPv4 || [])[0] || '';
  // console.error({result, iface: ifaceList, x: iface});

  return iface.address;
};

// console.log(exports.localIp());
