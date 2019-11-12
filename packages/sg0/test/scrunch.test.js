
const sg                      = require('..');
const test                    = require('ava');

test('sg.scrunch', t => {
  const result  = sg.scrunch([null, 2]);
  t.deepEqual(result, [2]);
});

test('sg.scrunch nothing to do', t => {
  const result  = sg.scrunch([2]);
  t.deepEqual(result, [2]);
});

test('sg.scrunch multiple removals', t => {
  const result  = sg.scrunch([null, 2, undefined, 4]);
  t.deepEqual(result, [2,4]);
});

test('sg.scrunch does not remove falsy (false)', t => {
  const result  = sg.scrunch(['foo', false, 4]);
  t.deepEqual(result, ['foo', false, 4]);
});

test('sg.scrunch does not remove falsy ("" - space)', t => {
  const result  = sg.scrunch(['bar', '', 4]);
  t.deepEqual(result, ['bar', '', 4]);
});

