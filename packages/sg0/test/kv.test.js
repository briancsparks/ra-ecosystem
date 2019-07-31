
const sg                      = require('..');
const test                    = require('ava');

test('works', t => {
  t.pass();
});

test('sg.kv basic use case', t => {
  const result = sg.kv({}, 'key', 'value');

  t.deepEqual(result, {key: 'value'});
});

test('sg.kv basic use case, updates orig', t => {
  const other  = {one: 'two'};
  const result = sg.kv(other, 'key', 'value');

  t.deepEqual(result, {one: 'two', key: 'value'});
  t.deepEqual(other, {one: 'two', key: 'value'});
});

test('sg.ap basic use case', t => {
  const result = sg.ap([], 'one');

  t.deepEqual(result, ['one']);
});

test('sg.ap basic use case, starting with non-empty Array', t => {
  const result = sg.ap(['zero'], 'one');

  t.deepEqual(result, ['zero', 'one']);
});

test('sg.ap basic use case, using rest', t => {
  const result = sg.ap([], 'one', 'two');

  t.deepEqual(result, ['one', 'two']);
});

test('sg.ap basic use case, no fizzling on null', t => {
  const result = sg.ap(['zero'], null);

  t.deepEqual(result, ['zero', null]);
});

test('sg.ap basic use case, fizzling on undefined', t => {
  const x = {};
  const result = sg.ap(['zero'], x.y);

  t.deepEqual(result, ['zero']);
});

