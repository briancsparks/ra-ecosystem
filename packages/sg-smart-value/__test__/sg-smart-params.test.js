
const sg                      = require('..');
const test                    = require('ava');



test.skip(`parseParam is smart`, t => {
  const x = sg.parseParam(splitify(`--x-content-length=55`));

  t.deepEqual(x, {x_content_length: 55});
});

test.skip(`arrayParam is smart`, t => {
  const x = sg.arrayParam(splitify(`--x-content-length=55`));

  t.deepEqual(x, {x_content_length: 55});
});



function splitify(str) {
  return str.split(/[\t ]+/g);
}



