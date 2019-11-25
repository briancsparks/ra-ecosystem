
const sg                      = require('..');
const test                    = require('ava');

test('sg.pad basic', t => {
  const val = 'foo';

  var result = sg.pad(5, val);

  t.is(result, "  foo");
});

