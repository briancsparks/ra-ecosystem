
const sg                      = require('sg0');

module.exports.logSmData = logSmData;
module.exports.smArgv    = smArgv;
module.exports.smArgv2   = smArgv2;

function logSmData(x) {
  return sg.reduceObj(x, {}, (m,value,key) => {

    if (key.toLowerCase() === 'data') {
      const json = sg.safeJSONStringify(value, null, null);
      if (json && json.length > 265) {
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

function smArgv(argv) {

  return {...argv,
    __meta__: {...argv.__meta__,
      event : !!argv.__meta__.event
    }
  };
}

function smArgv2(argv_) {
  var argv = argv_;
  if (Array.isArray(argv)) {
    // argv = argv[0];
    return {argv:[smArgv(argv[0])]};
  }

  return {...argv,
    __meta__: {...argv.__meta__,
      event : !!argv.__meta__.event
    }
  };
}
