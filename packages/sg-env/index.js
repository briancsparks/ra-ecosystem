/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */
const sg                      = require('@sg0/sg-smart-value');

sg.re_export(module, sg);

module.exports.ENV          = ENV;

if (require.main === module) {
  const ENV     = module.exports.ENV();
  const fnName  = process.argv[2];

  if (ENV[fnName]) {
    console.log(ENV[fnName](process.argv[3]));
  } else {
    console.error(`No ${fnName} in ENV.`);
  }
}


// TODO: Add .env files

function ENV(...args) {
  if (!(this instanceof ENV))     { return new ENV(...args); }

  var   self = this;

  const [defs ={}, overrides ={}, replacement =process.env] = args;

  const process_env = sg.extend(defs, overrides, replacement);

  self._at = function(name) {
    if (name in process_env)      { return process_env[name]; }
  };

  self._AT = function(name) {
    const NAME  = name.toUpperCase();
    if (NAME in process_env)      { return process_env[NAME]; }
  };

  self.at = function(name) {
    if (name in process_env)      { return sg.smartValue(self._at(name)); }
  };

  self.lc = function(name) {
    const value = self._at(name);
    if (!sg.isnt(value))          { return value.toLowerCase(); }
  };

  self.UC = function(name) {
    const value = self._at(name);
    if (!sg.isnt(value))          { return value.toUpperCase(); }
  };

  self.host = function(name) {

    var value;
    if (!sg.isnt(value = self._AT(`${name}_HOST`)))          { return value; }
    if (!sg.isnt(value = self._at(name)))                    { return value; }

    // TODO: check if it is in /etc/hosts

    return name;
  };

  self.port = function(name) {
    var value;
    if (!sg.isnt(value = self._AT(`${name}_PORT`)))          { return value; }

    switch (name.toLowerCase()) {
      case 'redis':                       return 6379;
      case 'mongo':
      case 'mongodb':                     return 27017;
    }
  };
}

