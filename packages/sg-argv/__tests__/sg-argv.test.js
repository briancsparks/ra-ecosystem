
const sg                      = require('..');
const test                    = require('ava');

test('ARGV simple', t => {
  const argv      = 'a b --long=foo'.split(' ');

  const ARGV = sg.ARGV(null, argv);

  t.snapshot(ARGV);
});

test('ARGV simple short', t => {
  const argv      = 'a b -l'.split(' ');

  const ARGV = sg.ARGV(null, argv);

  t.snapshot(ARGV);
});

test('ARGV simple array', t => {
  const argv      = 'a b --arr= 1 2'.split(' ');

  const ARGV = sg.ARGV(null, argv);

  // t.deepEqual(ARGV, {_:[], arr:[1,2]});
  t.snapshot(ARGV);
});

test('ARGV array with snake key', t => {
  const argv      = 'a b --arr-two= 1 2'.split(' ');

  const ARGV = sg.ARGV(null, argv);

  // t.deepEqual(ARGV, {_:[], arr_two:[1,2]});
  t.snapshot(ARGV);
});

