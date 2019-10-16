
const sg                      = require('sg0');
const utils                   = require('../utils');

const {
  noop,
  std3args
}                             = utils;


const dockerfile = function(self, types, ...args) {
  const [ filename, options = {} ]  = args;
  const goptions                    = options.argv || {};
  var   t = self;

  self.from = self.FROM = function(image) {
    self.image = image;
    t.append(`FROM ${image}`);
  };

  var apt_get_updated = false;

  self.packages = function(...args) {
    const packages = sg.reduce(args, [], (m, pakage) => {
      return [ ...m, ...pakage.split(',') ];
    });

    if (!apt_get_updated) {
      t.append(
        `RUN apt-get update`);
        apt_get_updated = true;
    }

    t.append_stitched(`
      RUN apt-get install -y`,
        packages);
  };

  self.run = self.RUN = function(...args) {
    return self.append(...args);
  };

  self.singularFileType = true;
  self.getFilename = function(smart) {
    return 'Dockerfile';
  };
};
dockerfile.type = 'dockerfile.null';

module.exports = dockerfile;
