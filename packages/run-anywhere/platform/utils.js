
/**
 * @file
 *
 * This is the file for users of platform.
 *
 * utils.js is for utilities that help implement platform.
 */
const assert                  = require('assert');

module.exports.assertArgvContext = assertArgvContext;

function assertArgvContext(haveArgv, argv, haveContext, context, filename) {
  // const loud = true;
  const loud = false;


  var numBad = 0;
  if (haveArgv && argv) {
    ok(good, dump, argv.__meta__,         `argv.__meta__ isnt`);
    ok(good, dump, argv.__meta__ && argv.__meta__.query,         `argv.__meta__.query isnt`);
  }

  if (haveContext && context) {
    ok(good, dump, context.isRaInvoked,   `context.isRaInvoked isnt`);
    ok(good, dump, context.invokedFnName, `context.invokedFnName isnt`);
    ok(good, dump, context.runAnywhere,   `context.runAnywhere isnt`);
  }

  if (numBad === 0 && loud) {
    good(`worked`);
  }

  function dump(msg) {
    console.error(`ASSERTION FAIL ${msg} from ${filename}`, {argv: Object.keys(argv), context: Object.keys(context)});
    numBad += 1;
  }

  function good(msg) {
    console.log(`good ${msg} from ${filename}`, {argv: argv && argvKeys(), context: context && Object.keys(context)});
  }

  function argvKeys() {
    return [[...Object.keys(argv)], [...(Object.keys(argv.__meta__ ||{}))]];
  }

  function ok(good, dump, pred, msg) {
    if (!pred) {
      dump(msg);
    }

    if (!loud) { return; }

    assert.ok(pred, msg);
  }

}

