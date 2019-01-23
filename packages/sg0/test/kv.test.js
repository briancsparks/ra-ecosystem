
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

