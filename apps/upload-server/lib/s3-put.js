
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const fs                      = require('fs');

const mod                     = ra.modSquad(module, 's3put');
const quickNet                = require('quick-net');

const {
  libAws
}                             = quickNet;
const {
  awsService
}                             = libAws;


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

mod.xport({uploadStreamToS3: function(argv, context, callback) {

  // ra invoke apps\upload-server\lib\s3-put.js uploadS3 --bucket= --key= --file=

  const ractx     = context.runAnywhere || {};
  const { fra }   = ractx.s3put__uploadStreamToS3;

  return fra.iwrap(function(abort) {

    const Bucket            = fra.arg(argv, 'Bucket,bucket', {required:true});
    const Key               = fra.arg(argv, 'Key,key', {required:true});
    var   Body              = fra.arg(argv, 'Body');
    const filename          = fra.arg(argv, 'filename');

    if (fra.argErrors({oneOf:{Body,filename}}))    { return fra.abort(); }

    if (Body) {
      return sendUpload();
    }

    /* otherwise, load a file */
    Body = fs.createReadStream(filename);
    sendUpload();

    function sendUpload() {
      sg.debugLog(`sendingupload`, {ManagedUpload: awsService('S3').ManagedUpload});
      var upload = awsService('S3').upload({Bucket, Key, Body}, {partSize: 6 * 1024 * 1024});

      upload.on('httpUploadProgress', (progress) => {
        sg.debugLog(`uploading file`, {progress});
      });

      upload.send(function(err, data) {
        if (!sg.ok(err, data))  { sg.logError(err, `sending upload`, {Bucket, Key}); }
        return callback(err, data);
      });
    }
  });
}});


// -------------------------------------------------------------------------------------
//  Helper Functions
//


