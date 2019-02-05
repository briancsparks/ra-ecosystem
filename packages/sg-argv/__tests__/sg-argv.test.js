
const sg                      = require('..');
const test                    = require('ava');

test('ARGV simple', t => {
  const argv      = 'a b --long=foo'.split(' ');

  const ARGV = sg.ARGV(argv);

  t.snapshot(ARGV);
});


