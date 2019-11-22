
const sg                     = require('sg0');

module.exports.smlog      = smlog;
module.exports.smlogitem  = smlogitem;

// ------------------------------------------------------------------------------------------------------------------
function smlog(args) {
  return sg.reduce(args, {}, (m,v,k) => {
    return sg.kv(m,k, smlogitem(v));
  });
}

function smlogitem(item, maxLen =256) {
  if (typeof item === 'string') { return item.substr(0, maxLen-1); }

  var s;

  // Is it an Array?
  if (Array.isArray(item)) {

    // If the stringification is long, maybe trim it
    s = s || sg.safeJSONStringify(item);
    if (s.length > maxLen) {

      // Too long?  Convert to [item[0], '...plus 500000 more']
      if (item.length > 2) {
        return smlogitem([item[0], `...plus ${item.length -1} more`]);
      }

      // If its still too long, just say how many items
      return [`${item.length} items`];
    }
  }

  // An object.  Truncate to maxLen
  if (sg.isObject(item)) {
    s = s || sg.safeJSONStringify(item);
    if (s.length > maxLen)                           { return s.substr(0, maxLen-1); }
  }

  return item;
}

