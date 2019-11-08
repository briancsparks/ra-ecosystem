/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-env'));
const { _ }                   = sg;
const os                      = require('os');

const ENV                     = sg.ENV();


/**
 * Builds:
 *
 *   proto://pre/namespace/tween/quick-net/type/path
 *   first:pre:namespace:tween:quick-net:type:path
 *
 * @param {*} proto
 * @param {*} first
 * @param {*} pre
 * @param {*} tween
 * @param {*} type
 * @param {*} path
 * @param {*} namespace_
 * @param {*} options
 * @returns
 */
exports.namespacedPath = function(proto_, first, pre, tween, type, path, namespace_, options ={sep:'/'}) {
  const proto     = proto_ ? (proto_.endsWith('://') ? proto_ : proto_+'://') : '';
  const namespace = namespace_ || ENV.at('NAMESPACE') || 'projectx';

  var parts = [first, pre, namespace, tween, 'quick-net', type, path];

  if (!options.sparse) {
    parts = _.compact(parts);
  }

  const str = proto +  parts.join(options.sep);
  return str;
};

// exports.s3deployPath = function(path, namespace) {
//   return exports.namespacedPath('s3', 'deploy', path, namespace);
// };

exports.mkS3path = function(namespace, pre =null, tween =null) {
  return function(type, path) {
    return exports.namespacedPath('s3', /*first*/null, pre, tween, type, path, namespace, {sep:'/'});
  };
};

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

exports.smJson = function(json_) {
  const json = (sg.isObject(json_) ? JSON.stringify(json_) : json_) || '';
  return `"${json.substr(0, 23)}..." length: ${json.length}`;
};

exports.__asJSON = function(type, id, spec_) {
  const spec = {type, id, spec:spec_};
  return ['__asJSON: '+JSON.stringify(spec), spec];
};

exports.parseAsJSON = function(lines) {
  if (!Array.isArray(lines))  { return exports.parseAsJSON(lines.split('\n')); }

  const len   = lines.length;

  for (let i = 0; i < len; ++i) {
    let m = lines[i].match(/ __asJSON:\s(.*)/);
    if (m) {
      let json = sg.safeJSONParse(m[1]);
      if (json) {
        return json;
      }
    }
  }
};


exports.mkClientAndSessionIds = function(argv) {
  var   sessionId = argv.sessionId;
  var   clientId  = argv.clientId;

  if (!clientId) {
    if (!sessionId) {
      // Make both
      sessionId = `${mkClientId()}-Xx-${mkSessionTime()}`;
      return exports.mkClientAndSessionIds({sessionId});
    }

    // sessionId, but not clientId
    clientId = (sessionId.split('-')[0]) || mkClientId();
    return {clientId, sessionId};
  }

  // We have clientId, do we have sessionId?
  if (!sessionId) {
    sessionId = `${clientId}-${mkSessionTime()}`;
  }

  return {clientId, sessionId};
};

const letters     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const lettersLen  = letters.length;
const alphabet    = letters + '0123456789';
const alphaLen    = alphabet.length;

function randItem(max) {
  return alphabet[Math.floor(Math.random() * Math.floor(max))];
}

const clientIdLen = 64;
function mkClientId() {
  var id = randItem(lettersLen);
  for (let i = 1; i < clientIdLen; ++i) {
    id += randItem(alphaLen);
  }
}

function mkSessionTime() {
  const now = new Date();
  return '' +
    pad(4, now.getUTCFullYear()) +
    pad(2, now.getUTCMonth()+1) +
    pad(2, now.getUTCDate()) +
    pad(2, now.getUTCHours()) +
    pad(2, now.getUTCMinutes()) +
    pad(2, now.getUTCSeconds()) +
    pad(3, now.getUTCMilliseconds());
}

function pad(len, x_, ch_) {
  var x   = ''+x_;
  var ch  = ch_ || '0';

  while (x.length < len) {
    x = ch + x;
  }

  return x;
}




// console.log(exports.localIp());
