
const _                       = require('lodash');
const s3                      = require('./s3');

expo(s3);

function expo(mod) {
  _.each(mod, (value, name) => {
    exports[name] = value;
  });
}
