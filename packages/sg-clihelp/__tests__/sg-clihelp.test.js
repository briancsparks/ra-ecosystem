
const sg                      = require('..');
const test                    = require('ava');

const path                    = require('path');

test('sanity', t => {
  const a         = {a:'foo', b:'bar', d:{e:'all'}};

  t.deepEqual(a, {a:'foo', b:'bar', d:{e:'all'}});
});

test('from works', t => {
  const stage         = 'dev';
  const packageDir    = path.join(__dirname, 'test-data');
  const key           = sg.from([packageDir, '_config', stage, 'env.json'], 'key');
  const classB        = sg.from([packageDir, '_config', stage, 'env.json'], 'classB');

  t.deepEqual({key, classB}, {key: "mario_demo", classB: 21});
});

test('from does not error for undefined path segments', t => {
  var   stage;
  const packageDir    = path.join(__dirname, 'test-data');
  const key           = sg.from([packageDir, '_config', stage, 'env.json'], 'key')    || 'unkey';
  const classB        = sg.from([packageDir, '_config', stage, 'env.json'], 'classB') || 'unclassB';

  t.deepEqual({key, classB}, {key: 'unkey', classB: 'unclassB'});
});



