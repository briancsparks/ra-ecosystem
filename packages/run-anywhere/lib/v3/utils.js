
const sg                      = require('sg0');

module.exports.logSmData = logSmData;

function logSmData(x) {
  return sg.reduceObj(x, {}, (m,value,key) => {

    if (key.toLowerCase() === 'data') {
      const json = sg.safeJSONStringify(value, null, null);
      if (json.length > 265) {
        return [json.substr(0,255) + ` ... (and ${json.length - 256} more)`];
      }

      return [value];
    }
    else if (key.toLowerCase() === 'rest') {
      return !(Array.isArray(value) && value.length === 0);
    }

    return true;
  });
}
