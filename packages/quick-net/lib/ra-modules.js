
const sg    = require('sg-clihelp');
const path  = require('path');

const modFnMap = {
  datatapDataPtr : {
    filename: path.join(__dirname, 'data-tap', 'data-ptr.js'),
    fnNames:  ['pushDataPtr'],
  },
  datatapFanout : {
    filename: path.join(__dirname, 'data-tap', 'fanout.js'),
    fnNames:  ['pushData', 'pushAction'],
  },
  datatapRead : {
    filename: path.join(__dirname, 'data-tap', 'read.js'),
    fnNames:  ['readData'],
  },
  datatapStatus : {
    filename: path.join(__dirname, 'data-tap', 'status.js'),
    fnNames:  ['pushStatus'],
  },
};

module.exports = {
  modFnMap,
  filenames: [
    ...sg.reduce(modFnMap, [], (m, mod) => [...m, mod.filename]),
    // path.join(__dirname, 'data-tap', 'data-ptr.js'),
    // path.join(__dirname, 'data-tap', 'fanout.js'),
    // path.join(__dirname, 'data-tap', 'read.js'),
    // path.join(__dirname, 'data-tap', 'status.js'),

    path.join(__dirname, 'data-transfer.js'),
  ]
};
