
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;


// -------------------------------------------------------------------------------------
//  Data
//


// -------------------------------------------------------------------------------------
//  Functions
//

/**
 * Checks to see if vars (usually function arguments) are null or undefined.
 *
 * sg.check('abc', __filename, {argv}, 'coke.and;smile', {context}, 'foo;bar.baz');
 *
 * * `argv` must not be null or undefined.
 * * `argv.coke.and` must not be null or undefined.
 * * `argv.smile` must not be null or undefined.
 * * `context` must not be null or undefined.
 * * `context.foo` must not be null or undefined.
 * * `context.bar.baz` must not be null or undefined.
 *
 * @param {string|number}   id        - The id of this checker
 * @param {string}          filename  - The filename of the caller (is usually __filename)
 * @param {object}          namedArg  - An object like {options} ('options' is the name of the arg)
 * @param {[string]}        x         - Semicolon separated list of dotted keys.
 * @param {*}               rest      - The rest of the params
 *
 * @returns {boolean}       `false` if the check fails.
 */
sg.check = function(id, filename, namedArg, x, ...rest) {

  var   result    = true;

  const names     = sg.keys(namedArg);            // ['argv']
  const name      = names[0];                     // 'argv'
  const arg       = namedArg[name];               // {coke:{and:'jack'},smile:42}
  const argKeys   = sg.keys(arg);                 // ['coke','smile']

  if (sg.isnt(arg)) {
    sg.bigNag(`check failed (${arg}) when checking (${id})(1) ${name} in ${filename}`);
    result = false;
  }

  _.each(namedArg, function(value, key) {         // [{and:jack},'coke']; then [42,'smile']
    if (sg.isnt(value)) {
      sg.bigNag(`check failed (${value}) when checking (${id})(2) ${name}.${key} in ${filename}, have:`, argKeys);
      result = false;
    }
  });

  if (arguments.length <= 3)      { return result; }

  if (typeof x === 'string') {
    let   dottedKeysList = x.split(';');          // ['coke.and','smile']
    _.each(dottedKeysList, function(dottedKey) {
      if (sg.isnt(sg.deref(arg, dottedKey))) {
        sg.bigNag(`check failed (${sg.deref(arg, dottedKey)}) when checking (${id})(3) ${name}.${dottedKey} in ${filename}, have:`, argKeys);
        result = false;
      }
    });

    // Are we done?
    if (arguments.length === 4)   { return result; }

    // Not done... continue on with the rest of the params (like checking context)
    return sg.check(id, filename, ...rest) && result;
  }

  // Not done... continue on with the rest of the params (like checking context)
  return sg.check(id, filename, x, ...rest) && result;
};

/**
 * Log a big, flashy error.
 *
 * @param {string} msg  - The message to write
 * @param {object} args - An object to dump
 */
sg.bigNag = function(msg, ...args) {
  var inspectedArgs = _.map(args, (arg) => {
    return sg.inspect(args);
  });

  console.error(`${decorate(msg,3)}`, ...inspectedArgs);
};




// -------------------------------------------------------------------------------------
// exports
//

_.each(sg, (v,k) => {
  module.exports[k] = v;
});

// -------------------------------------------------------------------------------------
//  Helper Functions
//

function decorate(str, level=1) {
  return `     -----     ${str}     -----`;
}

