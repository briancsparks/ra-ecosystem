
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
