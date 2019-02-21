

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg;
const qm                      = ra.get3rdPartyLib('quick-merge');
const execa                   = require('execa');
const getStream               = require('get-stream');

const ARGV                    = sg.ARGV();


// -------------------------------------------------------------------------------------
//  Data
//


// -------------------------------------------------------------------------------------
//  Functions
//


// -------------------------------------------------------------------------------------
// exports
//

exports.execa = execa;
exports.execz = execz;

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function execz(a, ...rest) {
  if (sg.isnt(a))                                   { return execz({next:noop}, ...rest); }
  if (_.isFunction(a))                              { return execz({next:a}, ...rest); }

  // execz({}, file, command, args)
  if (rest.length === 3) {
    const [ b, c, rest2 ] = rest;
    return execz(a, [...sg.arrayify(b), ...sg.arrayify(c), ...sg.arrayify(rest2) ]);
  }

  return _execz_(a, ...rest);
}

function _execz_({next,show=true}, args /*file, command, rest*/) {

  const cmdline                   = qm.stitch(args);
  const [file, command, ...rest]  = cmdline;

  ARGV.v(`execz`, {file, command, rest, next: (next === noop ? 'noop' : next) || 'function'});

  const stdout = execa(file, [command, ...rest]).stdout;

  if (show && !ARGV.quiet) {
    stdout.pipe(process.stdout);
  }

  getStream(stdout).then(content => {
    ARGV.v(`-------------------------------------------------------\n  execz exit, ${sg.splitLn(content).length} lines`);
    return (next || function(){})();
  });
}

function noop(){}

