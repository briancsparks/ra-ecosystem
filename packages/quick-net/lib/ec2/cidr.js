if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;

/**
 * Returns a netmask, given the number of gits in the cidr.
 *
 * @param {*} bits
 * @returns
 */
const bitsToNetmask = function(bits) {
  var result = 0;
  var i;

  for (i = 0; i < bits; ++i) {
    result <<= 1;
    result  |= 1;
  }

  for (; i < 32; ++i) {
    result <<= 1;
  }

  return fixNegative(result);
};
exports.bitsToNetmask = bitsToNetmask;

/**
 * Returns the number of bits, given the netmask.
 *
 * @param {*} netmask
 * @returns
 */
const netmaskToBits = function(netmask) {
  var bits  = 0;

  var bit   = 1;
  for (var i = 0; i < 32; ++i) {
    if ((netmask & bit) !== 0) {
      bits += 1;
    }
    bit <<= 1;
  }

  return bits;
};
exports.netmaskToBits = netmaskToBits;

/**
 * Fix an ip number that has been manipulated with bit-wise operations.
 *
 * Because of the way that JavaScript does bit-wise operations, a number may
 * end up being negative (if bit 31 is set.) Fix that.
 *
 * @param {*} ipNum
 */
const fixNegative = function(ipNum) {

  // If it is not negative, no fixup is needed
  if ((ipNum & 0x80000000) === 0)       { return ipNum; }

  // OK, it needs fixing
  return (ipNum & 0x7fffffff) + 0x80000000;
};
exports.fixNegative = fixNegative;

/**
 * Turn an IP string into a Number.
 *
 * @param {*} ip
 * @returns
 */
const ipNumber = function(ip) {
  if (sg.isnt(ip))      { return ip; }
  if (_.isNumber(ip))   { return ip; }

  const octets = ip.split(/[^0-9]+/).map(s => +s);
  const [ _1, _2, _3, _4 ] = octets;

  return fixNegative((_1<<24) + (_2<<16) + (_3<<8) + _4);
};
exports.ipNumber = ipNumber;

/**
 * Returns the first valid IP within the subnet, as a Number.
 *
 * @param {*} ip
 * @param {*} netmask
 */
const firstIpInSubnet = function(ip_, netmask_) {
  const ip        = ipNumber(ip_);
  const netmask   = ipNumber(netmask_);

  return fixNegative(ip & netmask);
};
exports.firstIpInSubnet = firstIpInSubnet;

/**
 * Returns the last valid IP within the subnet, as a Number.
 *
 * @param {*} ip
 * @param {*} netmask
 * @returns
 */
const lastIpInSubnet = function(ip_, netmask_) {
  const ip        = ipNumber(ip_);
  const netmask   = ipNumber(netmask_);

  return fixNegative((ip & netmask) | ~netmask);
};
exports.lastIpInSubnet = lastIpInSubnet;

/**
 * Returns if the string is a valid CIDR format.
 *
 * @param {*} cidr
 */
const isCidr = function(cidr) {
  if (sg.isnt(cidr))                          { return false; }
  const octets    = cidr.split(/[^0-9]+/);

  if (octets.length !== 5)                    { return false; }

  return sg.reduce(octets, true, (m, octet) => {
    return m && (+octet >= 0 && +octet < 256);
  });
};
exports.isCidr = isCidr;

/**
 * Returns the first valid IP within the CIDR, as a Number.
 *
 * @param {*} cidr
 * @returns
 */
const firstIpInCidr = function(cidr) {
  const octets    = cidr.split(/[^0-9]+/);
  const netmask   = bitsToNetmask(+octets.pop());
  const ip        = ipNumber(octets.join('.'));

  return firstIpInSubnet(ip, netmask);
};
exports.firstIpInCidr = firstIpInCidr;

/**
 * Returns the last valid IP within the CIDR, as a Number.
 *
 * @param {*} cidr
 * @returns
 */
const lastIpInCidr = function(cidr) {
  const octets    = cidr.split(/[^0-9]+/);
  const netmask   = bitsToNetmask(+octets.pop());
  const ip        = ipNumber(octets.join('.'));

  return lastIpInSubnet(ip, netmask);
};
exports.lastIpInCidr = lastIpInCidr;

/**
 * Convert the Number into an IP address string.
 *
 * @param {*} num
 */
const toIp = function(num) {

  const additional = (num & 0x80000000) ? 0x80 : 0;

  const _1  = ((num & 0x7f000000) >> 24) + additional;
  const _2  =  (num & 0x00ff0000) >> 16;
  const _3  =  (num & 0x0000ff00) >>  8;
  const _4  =  (num & 0x000000ff);


  return [''+_1, ''+_2, ''+_3, ''+_4].join('.');
};
exports.toIp = toIp;

/**
 * Returns the cidr from the IP / netmask, as a string.
 *
 * @param {*} ipNum
 * @param {*} netmask
 * @returns
 */
const toCidr = function(ipNum, netmask) {
  const bits = netmaskToBits(netmask);
  const ip   = firstIpInSubnet(ipNum, netmask);

  return `${toIp(ip)}/${bits}`;
};
exports.toCidr = toCidr;


// console.log(toIp(2130706433));
// console.log(ipNumber(toIp(2130706433)));
// console.log(bitsToNetmask(24).toString(16));
// console.log(toIp(firstIpInCidr('10.111.23.45/22')));
// console.log(toIp(lastIpInCidr('10.111.23.45/22')));
// console.log(ipNumber('192.168.10.10').toString(16));
// console.log(toIp(ipNumber('192.168.10.10')));
// console.log(ipNumber('255.255.255.255').toString(16));
// console.log(ipNumber('255.255.255.0').toString(16));
// console.log(netmaskToBits(ipNumber('255.255.255.0')));
// console.log(toCidr(ipNumber('192.168.10.10'), ipNumber('255.255.255.0')));
