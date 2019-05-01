
const sg                      = require('..');
const test                    = require('ava');

test('sg.reduceFirst gets first', t => {
  const start   = {one: 'orig', two:['button my show'], three: 'another'};

  const result  = sg.reduceFirst(start, null, (m,v,k) => {
    return sg.kv(m,k,v);
  });

  t.deepEqual(result, {one: 'orig'});
});

test('sg.reduceFirst gets first of type', t => {
  const start   = {one: 'orig', two:['button my show'], three: 'another'};

  const result  = sg.reduceFirst(start, null, (m,v,k) => {
    if (Array.isArray(v)) {
      return sg.kv(m,k,v);
    }
  });

  t.deepEqual(result, {two:['button my show']});
});

test('sg.reduceFirst initial as default', t => {
  const start   = {one: 'orig', two:['button my show'], three: 'another'};
  const key     = 'tw';

  // Do any keys in `start` start with key?
  const result  = sg.reduceFirst(start, false, (m,v,k) => {
    if (k.startsWith(key)) {
      return true;
    }
  });

  t.deepEqual(result, true);
});

test('sg.reduceFirst initial as default is truthy', t => {
  const start   = {one: 'orig', two:['button my show'], three: 'another'};
  const key     = 'tw';

  // Make sure no keys on `start` start with key
  const result  = sg.reduceFirst(start, true, (m,v,k) => {
    if (k.startsWith(key)) {
      return false;
    }
  });

  t.deepEqual(result, false);
});



