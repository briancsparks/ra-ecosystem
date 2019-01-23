
const sg                      = require('..');
const test                    = require('ava');

test('works', t => {
  t.pass();
});

test('sg.extend basic use case', t => {
  const result = sg.extend({}, {key:'value'});

  t.deepEqual(result, {key: 'value'});
});

test('sg.extend basic use case, safe', t => {
  const other  = {one: 'two'};
  const result = sg.extend(other, {key:'value'});

  t.deepEqual(result, {one: 'two', key: 'value'});
  t.deepEqual(other, {one: 'two'});
});

