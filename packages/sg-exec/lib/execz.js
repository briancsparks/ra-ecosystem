
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg-argv');
const { _ }                   = sg;
const qm                      = require('quick-merge');
const execa                   = require('execa');
const getStream               = require('get-stream');
// const util                    = require('util');

var   lib                     = {};

const ARGV                    = sg.ARGV();

// -------------------------------------------------------------------------------------
// exports
//

exports.execz = execz;
exports.execy = execy;

// exports.async = {};
// exports.async.execz = util.promisify(execz);

// -------------------------------------------------------------------------------------
//  Helper Functions
//

// ------------------------------------------------------------------------------------------------------------------
function execzX(...args_) {
  var   args          = _.toArray(args_);

  const next          = args.pop() || function(){};
  var   options       = (sg.isObject(args[0]) ? args.shift() : {});
  var   execa_options = (sg.isObject(args[0]) ? args.shift() : {});

  return _execz_(sg.merge(options, {next}), execa_options, args);
}

// ------------------------------------------------------------------------------------------------------------------
function exec_ez(...args_) {
  var   args          = _.toArray(args_);
  var   optionses     = [];

  var   argv          = {};
  var   context       = {};
  var   execa_options = {};
  var   options       = {};
  const callback      = _.isFunction(_.last(args)) ? args.pop() : noop;

  // Pull up to 2 objects from the end of the args (sg.ap will fizzle if passed undefined)
  sg.ap(optionses, sg.isObject(_.last(args)) ? args.pop() : args._undefined_);
  sg.ap(optionses, sg.isObject(_.last(args)) ? args.pop() : args._undefined_);

  if (optionses.length === 2) {
    // Note that the first one pushed was at the end of the arg list
    context = optionses[0];
    options = optionses[1];
  } else if (optionses.length === 1) {
    options = optionses[0];
  }

  const extracted = sg.extracts(options, 'execa', 'execa_options');
  execa_options = extracted[sg.firstKey(extracted)];

  // Special processing for cwd
  const cwd       = sg.extract(options, 'cwd');
  execa_options   = sg.merge(execa_options, {cwd});

  return execz({args, ...options, execa_options}, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------
function execz(argv, context ={}, callback =noop) {
  if (typeof arguments[0] === 'string') { return exec_ez(..._.toArray(arguments)); }

  const noShow          = argv.noShow   || argv.no_show;
  const execa_options   = argv.execa    || argv.execa_options   || {};
  const args            = argv.args;

  // TODO: fail for wrong params

  return _execz_({noShow, execa_options, args}, context, callback);
}

// ------------------------------------------------------------------------------------------------------------------
function _execz_({args, noShow, execa_options}, context ={}, callback =noop) {
  const cmdline                   = qm.stitch(args);
  const [file, command, ...rest]  = cmdline;
  const cliArgs                   = _.compact([command, ...rest]);

  // What should we show?
  var   showPipedOut  = !noShow;
  var   showSummary   = true;

  if (ARGV.quiet) {
    showPipedOut = showSummary = false;
  }

  ARGV.i_if(showSummary, `\n================================================\n  ${file} ${cliArgs.join(' ')}\n------------------------------------------------`);

  if (ARGV.dry_run || ARGV.dryRun) {
    return callback(null, 'dry-run');
  }

  ARGV.v_if(!ARGV.quiet, `execz`, {file, cliArgs, execa_options, noShow, showPipedOut, showSummary});

  const exe = execa(file, cliArgs, execa_options);

  if (showPipedOut) {
    exe.stdout.pipe(process.stdout);
    exe.stderr.pipe(process.stderr);
  }

  getStream(exe.stdout).then(content => {
    ARGV.v_if(showSummary, `----------\n  exec(${file}) exit, ${sg.splitLn(content).length} lines\n----------------------------------------------------------`);
    return callback(null, content);
  });
}

// ------------------------------------------------------------------------------------------------------------------
function _execzX_({next,show=true}, execa_options, args /*file, command, rest*/) {
  const cmdline                   = qm.stitch(args);
  const [file, command, ...rest]  = cmdline;
  const cliArgs                   = _.compact([command, ...rest]);

  ARGV.v(`execzX`, {file, command, rest, show, next: (next === noop ? 'noop' : next) || 'function'});

  const stdout = execa(file, cliArgs, execa_options).stdout;

  if (show && !ARGV.quiet) {
    stdout.pipe(process.stdout);
  }

  getStream(stdout).then(content => {
    ARGV.v(`-------------------------------------------------------\n  execz exit, ${sg.splitLn(content).length} lines`);
    return (next || function(){})();
  });
}









// ------------------------------------------------------------------------------------------------------------------
function execy(...args_) {
  var   args          = _.toArray(args_);

  const next          = args.pop() || function(){};
  var   options       = (sg.isObject(args[0]) ? args.shift() : {});
  var   execa_options = (sg.isObject(args[0]) ? args.shift() : {});

  return _execy_(sg.merge(options, {next}), execa_options, args);
}

// ------------------------------------------------------------------------------------------------------------------
function _execy_({next,show=true}, execa_options, args /*file, command, rest*/) {
  const cmdline                   = qm.stitch(args);
  const [file, command, ...rest]  = cmdline;
  const cliArgs                   = _.compact([command, ...rest]);

  ARGV.v(`execy`, {file, command, rest, show, next: (next === noop ? 'noop' : next) || 'function'});

  const stdout = execa(file, cliArgs, execa_options).stdout;

  if (show && !ARGV.quiet) {
    stdout.pipe(process.stdout);
  }

  getStream(stdout).then(content => {
    ARGV.v(`-------------------------------------------------------\n  execy exit, ${sg.splitLn(content).length} lines`);
    return (next || function(){})();
  });
}

// ------------------------------------------------------------------------------------------------------------------
function noop(){}

