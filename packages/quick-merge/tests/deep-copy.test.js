
/**
 *
 */
const test                    = require('ava');
const quickMerge              = require('..');

const {
  deepCopy,
}                             = quickMerge;

test('deepCopy scalar', t => {
  const a       = 42;
  const result  = deepCopy(a);

  t.deepEqual(result, 42);
});

test('deepCopy object', t => {
  const a       = {a:42, c:{d:'foo'}};
  const result  = deepCopy(a);

  t.deepEqual(result, {a:42, c:{d:'foo'}});
});


