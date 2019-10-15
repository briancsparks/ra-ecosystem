
const sg                      = require('..');
const test                    = require('ava');

test('understands true', t => {
  const x = sg.smartValue('true');

  t.deepEqual(x, true);
});


test('understands TRUE', t => {
  const x = sg.smartValue('TRUE');

  t.deepEqual(x, true);
});


test('understands True', t => {
  const x = sg.smartValue('True');

  t.deepEqual(x, true);
});


test('understands false', t => {
  const x = sg.smartValue('false');

  t.deepEqual(x, false);
});


test('understands FALSE', t => {
  const x = sg.smartValue('FALSE');

  t.deepEqual(x, false);
});


test('understands False', t => {
  const x = sg.smartValue('False');

  t.deepEqual(x, false);
});


test('understands null', t => {
  const x = sg.smartValue('null');

  t.deepEqual(x, null);
});


test('understands NULL', t => {
  const x = sg.smartValue('NULL');

  t.deepEqual(x, null);
});


test('understands Null', t => {
  const x = sg.smartValue('Null');

  t.deepEqual(x, null);
});


test('understands ints test one', t => {
  const x = sg.smartValue('0');

  t.deepEqual(x, 0);
});


test('understands ints test two', t => {
  const x = sg.smartValue('12');

  t.deepEqual(x, 12);
});


test('understands ints test three', t => {
  const x = sg.smartValue('21234');

  t.deepEqual(x, 21234);
});


test('understands dates', t => {
  const x = sg.smartValue('2018-12-31T10:08:56.016Z');

  t.deepEqual(x, new Date('2018-12-31T10:08:56.016Z'));
});


test('understands real 1.25', t => {
  const x = sg.smartValue('1.25');

  t.deepEqual(x, 1.25);
});


test('understands real 0.5', t => {
  const x = sg.smartValue('0.5');

  t.deepEqual(x, 0.5);
});


test('understands real 1.0', t => {
  const x = sg.smartValue('1.0');

  t.deepEqual(x, 1.0);
});


test('understands real 2.', t => {
  const x = sg.smartValue('2.');

  t.deepEqual(x, 2.);
});


test('understands real .125', t => {
  const x = sg.smartValue('.125');

  t.deepEqual(x, .125);
});


test('understands regexp /ab[cbef]/', t => {
  const x = sg.smartValue('/ab[cbef]/');

  t.deepEqual(x, /ab[cbef]/);
});


test('understands JSON Object "{\"a\":2}"', t => {
  const x = sg.smartValue('{"a":2}');

  t.deepEqual(x, {"a":2});
});


test('understands JSON Object " \t{\"a\":2}"', t => {
  const x = sg.smartValue(' \t{"a":2}');

  t.deepEqual(x, {"a":2});
});


test('understands JSON Array', t => {
  const x = sg.smartValue('["a",2]');

  t.deepEqual(x, ["a",2]);
});


// ==================================================================================
// No False Positives
// ==================================================================================


test('understands "true "', t => {
  const x = sg.smartValue('true ');

  t.deepEqual(x, 'true ');
});


test('understands not-real 1.1.1', t => {
  const x = sg.smartValue('1.1.1');

  t.deepEqual(x, '1.1.1');
});


test('understands not JSON Object "{\"a\":2"', t => {
  const x = sg.smartValue('{"a":2');

  t.deepEqual(x, '{"a":2');
});


