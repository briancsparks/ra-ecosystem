
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
  createConfigMap : {
    filename: path.join(__dirname, 'k8s', 'lib', 'config-map.js'),
    fnNames:  ['createConfigMap', '_createConfigMap_'],
  },
  lambdaLayers : {
    filename: path.join(__dirname, '..', 'commands', 'lambda-deploy', 'layer.js'),
    fnNames:  ['mkDepLayer', 'depLayer'],
  },
  deployLambda : {
    filename: path.join(__dirname, '..', 'commands', 'lambda-deploy', 'deploy.js'),
    fnNames:  ['lambdaDeploy'],
  },
  vpcs: {
    filename: path.join(__dirname, '..', 'commands', 'vpcs.js'),
    fnNames:  ['getVpcSubnetsSgs'],
  },
  // ec2: {
  //   filename: path.join(__dirname, 'ec2', 'ec2.js'),
  //   fnNames:  ['upsertInstance'],
  // },
};

module.exports = {
  modFnMap,
  filenames: [
    ...sg.reduce(modFnMap, [], (m, mod) => [...m, mod.filename]),
    path.join(__dirname, 'data-transfer.js'),
    path.join(__dirname, 'ec2', 'ec2.js'),
  ]
};
