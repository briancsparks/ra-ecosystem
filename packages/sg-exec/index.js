if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;
// const qm                      = require('quick-merge');
const execa                   = require('execa');
// const getStream               = require('get-stream');

var   lib                     = {};
const curl                    = addToLib(require('./lib/curl'));
const execz                   = addToLib(require('./lib/execz'));
const exec_ez                 = addToLib(require('./lib/exec-ez'));

//const ARGV                    = sg.ARGV();

// -------------------------------------------------------------------------------------
// exports
//

exports.execa = execa;
// exports.execz = execz;

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function addToLib(mod) {
  _.each(mod, (v,k) => {
    exports[k] = v;
  });

  return mod;
}
