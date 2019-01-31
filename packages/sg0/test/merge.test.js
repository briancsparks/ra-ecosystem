
const sg                      = require('..');
const test                    = require('ava');

test('sg.merge keyname', t => {
  const start   = {first: 'orig'};
  var   one     = 'I';
  var   two     = 'II';
  var   three;

  const result  = sg.merge(start, {one, two, three});

  t.deepEqual(result, {first: 'orig', one: 'I', two: 'II'});
  t.deepEqual(start,  {first: 'orig'});
});

test('sg.merge not smart', t => {
  const start   = {first: 'orig'};
  var   one     = '1';
  var   three;

  const result  = sg.merge(start, {one, three});

  t.deepEqual(result, {first: 'orig', one: '1'});
  t.deepEqual(start,  {first: 'orig'});
});

