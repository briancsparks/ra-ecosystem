
const sg                      = require('..');
const test                    = require('ava');

test('sg.arrayify basic alredy array', t => {

  const result  = sg.arrayify([2]);

  t.deepEqual(result, [2]);
});

test('sg.arrayify basic not string, not array', t => {

  const result  = sg.arrayify(2);

  t.deepEqual(result, [2]);
});

test('sg.arrayify basic string, not splitable', t => {

  const result  = sg.arrayify('two');

  t.deepEqual(result, ['two']);
});

test('sg.arrayify basic string, splitable', t => {

  const result  = sg.arrayify('two,four');

  t.deepEqual(result, ['two', 'four']);
});

test('sg.arrayify basic string, splitable, skip split', t => {

  const result  = sg.arrayify('two,four', true);

  t.deepEqual(result, ['two,four']);
});

test('sg.arrayify undefined is empty Array', t => {

  const result  = sg.arrayify();

  t.deepEqual(result, []);
});

