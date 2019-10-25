
const sg                      = require('..');
const test                    = require('ava');



test(`does not understand JSON Object with single quote with low IQ "{'a':2}"`, t => {
  const x = sg.smartValue(`{'a':2}`, 0);

  t.deepEqual(x, `{'a':2}`);
});


test(`understands JSON Object with single quote "{'a':2}"`, t => {
  const x = sg.smartValue(`  {'a':2}`);

  t.deepEqual(x, {"a":2});
});


test(`understands JSON Object with leading whitespace and single quote " \t{'a':2}"`, t => {
  const x = sg.smartValue(` \t{'a':2}`);

  t.deepEqual(x, {"a":2});
});


test('understands JSON Array with single quote', t => {
  const x = sg.smartValue(`['a',2]`);

  t.deepEqual(x, ["a",2]);
});

