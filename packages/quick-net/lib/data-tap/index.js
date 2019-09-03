if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */

const ra                      = require('run-anywhere').v2;

ra.exportSubModules(module, [
  require('./data-ptr'),
  require('./fanout'),
  require('./read'),
  require('./status'),
]);

