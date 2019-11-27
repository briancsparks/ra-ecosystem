
const sg                      = require('..');
const test                    = require('ava');

test('understands true', t => {
  const ENV = sg.ENV({x:'true'});
  const x   = ENV.at('x');

  t.deepEqual(x, true);
});


test('understands TRUE', t => {
  const ENV = sg.ENV({x:'TRUE'});
  const x   = ENV.at('x');

  t.deepEqual(x, true);
});


test('understands True', t => {
  const ENV = sg.ENV({x:'True'});
  const x   = ENV.at('x');

  t.deepEqual(x, true);
});


test('understands ints', t => {
  const ENV = sg.ENV({x: 12});
  const x   = ENV.at('x');

  t.deepEqual(x, 12);
});


test('understands dates', t => {
  const ENV = sg.ENV({x: '2018-12-31T10:08:56.016Z'});
  const x   = ENV.at('x');

  t.deepEqual(x, new Date('2018-12-31T10:08:56.016Z'));
});


test('understands regexp /ab[cbef]/', t => {
  const ENV = sg.ENV({x: '/ab[cbef]/'});
  const x   = ENV.at('x');

  t.deepEqual(x, /ab[cbef]/);
});


test('understands JSON Object " \t{\"a\":2}"', t => {
  const ENV = sg.ENV({x: ' \t{"a":2}'});
  const x   = ENV.at('x');

  t.deepEqual(x, {"a":2});
});


test('understands JSON Array', t => {
  const ENV = sg.ENV({x: '["a",2]'});
  const x   = ENV.at('x');

  t.deepEqual(x, ["a",2]);
});


test('understands lowercase', t => {
  const ENV = sg.ENV({x: 'abCd'});
  const x   = ENV.lc('x');

  t.deepEqual(x, 'abcd');
});


test('understands uppercase', t => {
  const ENV = sg.ENV({x: 'abCd'});
  const x   = ENV.UC('x');

  t.deepEqual(x, 'ABCD');
});



