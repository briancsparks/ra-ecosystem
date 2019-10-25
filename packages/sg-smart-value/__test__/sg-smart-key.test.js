
const sg                      = require('..');
const test                    = require('ava');



test(`smartKey converts non-valid chars to underscore`, t => {
  const x = sg.smartKey('foo-bar');

  t.deepEqual(x, 'foo_bar');
});

test(`smartKey converts many non-valid chars to underscore`, t => {
  const x = sg.smartKey('foo-bar-baz-quxx');

  t.deepEqual(x, 'foo_bar_baz_quxx');
});

test(`smartKey lowercases the key`, t => {
  const x = sg.smartKey('FOO-bar-baz-quxx');

  t.deepEqual(x, 'foo_bar_baz_quxx');
});

test(`smartKey lowercases the key unless the caller wants it preserved`, t => {
  const x = sg.smartKey('FOO-bar-baz-quxx', true);

  t.deepEqual(x, 'FOO_bar_baz_quxx');
});

test(`smartKey knows keys do not begin with number`, t => {
  const x = sg.smartKey('0foo-bar');

  t.deepEqual(x, '_0foo_bar');
});

test(`smartKey can handle numbers`, t => {
  const x = sg.smartKey(55);

  t.deepEqual(x, '_55');
});

test(`smartKey knows that only strings and numbers are OK`, t => {
  const x = sg.smartKey(/regex/);

  t.falsy(x);
});


