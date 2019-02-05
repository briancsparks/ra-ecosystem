
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const sg                      = require('sg0');
const { _ }                   = sg;
const ra                      = require('run-anywhere').v2;
const libAws                  = require('../aws');

const mod                     = ra.modSquad(module, 'dynamoDb');
const dynamoDb                = libAws.awsService('DynamoDB');
const AwsFilterObject         = libAws.AwsFilterObject;

// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

mod.xport({upsertTable: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\db\dynamodb.js upsertTable --table=ratest_table --mode=PAY_PER_REQUEST --stream=new-and-old --hash=type --range=S,value
  // ra invoke packages\quick-net\lib\db\dynamodb.js upsertTable --table=ratest_table --mode=PROVISIONED     --stream=new-and-old --hash=type --range=S,value --read=2 --write=2

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx.dynamoDb__upsertTable;

  return fra.iwrap(function(abort) {
    const { createTable,describeTable } = libAws.awsFns(dynamoDb, 'createTable,describeTable', fra.opts({abort:false}), abort);

    const TableName         = fra.arg(argv, 'TableName,table,name', {required:true});
    const BillingMode       = fra.arg(argv, 'BillingMode,mode');
    const stream            = fra.arg(argv, 'stream');

    if (fra.argErrors())    { return fra.abort(); }

    var   params    = AwsFilterObject({TableName, BillingMode}, argv);

    if (!params.AttributeDefinitions && !params.KeySchema) {
      let   hash              = fra.arg(argv, 'hash,h', {required:true, array:true});
      let   range             = fra.arg(argv, 'range,r', {array:true});
      if (fra.argErrors())    { return fra.abort(); }

      params.AttributeDefinitions = [];
      params.KeySchema            = [];

      let   KeyType           = 'HASH';
      let   AttributeName     = hash.pop();
      let   AttributeType     = hash.shift() || 'S';

      params.AttributeDefinitions.push({AttributeName, AttributeType});
      params.KeySchema.push({AttributeName, KeyType});

      if (range) {
        KeyType               = 'RANGE';
        AttributeName         = range.pop();
        AttributeType         = range.shift() || 'S';

        params.AttributeDefinitions.push({AttributeName, AttributeType});
        params.KeySchema.push({AttributeName, KeyType});
      }
    }

    if (!params.ProvisionedThroughput && params.BillingMode === 'PROVISIONED') {
      let   read              = fra.arg(argv, 'read')   || fra.arg(argv, 'write');
      let   write             = fra.arg(argv, 'write')  || fra.arg(argv, 'read');
      if (fra.argErrors({read,write}))    { return fra.abort(); }

      params.ProvisionedThroughput = {
        ReadCapacityUnits:  read,
        WriteCapacityUnits: write
      };
    }

    if (stream) {
      params.StreamSpecification = {
        StreamEnabled: true,
        StreamViewType: getStreamType(stream)
      };
    }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return describeTable({TableName}, function(err, data) {
        if (err && err.code === 'ResourceNotFoundException')      { return next(); }

        my.result = {Table: data};
        my.found  = 1;
        return callback(null, my);
      });

    }, function(my, next) {
      return createTable(params, function(err, data) {

        my.result   = {Table: data.TableDefinitions};
        my.created  = 1;
        return next();
      });

    }, function(my, next) {

      return describeTable({TableName}, function(err, data) {
        my.result = {Table: data};
        return next();
      });

    }, function(my, next) {
      return next();
    }]);
  });
}});

// -------------------------------------------------------------------------------------
//  Helper Functions
//

const streamTypes = {
  "new":            'NEW_IMAGE',
  old:              'OLD_IMAGE',
  "new-and-old":    'NEW_AND_OLD_IMAGES',
  key:              'KEYS_ONLY'
};

function getStreamType(stream) {
  const type = streamTypes[stream];
  if (type) {
    return type;
  }

  return 'NEW_AND_OLD_IMAGE';
}

