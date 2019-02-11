
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
const express                 = ra.get3rdPartyLib('express');
const sgConfig                = ra.get3rdPartyLib('sg-config');
const router                  = express.Router();
const mod                     = ra.modSquad(module, 'uploadRoute');
const quickNet                = require('quick-net');

const s3put                   = require('../../lib/s3-put');

const {
  initialReqParams,
  _400, _200
}                             = quickNet.libHttp;
const config                  = sgConfig.configuration(process.env.HOME, 'upload_endpoint');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

const uploadHandler =
mod.reqHandler({uploadHandler: function(req, res) {

  const ractx     = req.runAnywhere || {};
  const { fra }   = (ractx.uploadRoute__uploadHandler || ractx);
  // var   argv      = initialReqParams(req, res);

  const Bucket    = config('UploadBucket') || config('Bucket');
  const subKey    = config('UploadSubKey') || config('Subkey');

  const ext       = 'bin';
  const checksum  = ''+Date.now();
  const Key       = `${subKey}/${checksum}.${ext}`;

  var   argv      = sg.merge({Bucket, Key, Body: req});

  const { uploadStreamToS3 }      = fra.loads(s3put, 'uploadStreamToS3', fra.opts({}));

  return uploadStreamToS3(argv, fra.opts({}), function(err, data) {
    if (err)      { return _400(req, res, err); }

    const payloadCount = 0;
    sg.debugLog(`uploadHandler (${payloadCount} items): ${req.url}`);

    data = _.pick(data, 'code', 'ok', 'ETag');
    return _200(req, res, data || {});
  });

}});

const fileHandler =
mod.reqHandler({fileHandler: function(req, res) {

  const ractx     = req.runAnywhere || {};
  const { fra }   = (ractx.uploadRoute__fileHandler || ractx);
  var   argv      = initialReqParams(req, res);

  const { uploadStreamToS3 }      = fra.loads(s3put, 'uploadStreamToS3', fra.opts({}));

  sg.debugLog(`calling uploadStreamToS3 on file ${argv.filename}`, {argv});
  return uploadStreamToS3(argv, fra.opts({}), function(err, data) {
    if (err)      { return _400(req, res, err); }

    const payloadCount = 0;
    sg.debugLog(`fileHandler (${payloadCount} items): ${req.url}`);
    return _200(req, res, data || {});
  });

}});

// -------------------------------------------------------------------------------------
//  Register our routes
//

router.put('/', uploadHandler);
router.post('/', uploadHandler);

router.put('/file', fileHandler);
router.post('/file', fileHandler);

// -------------------------------------------------------------------------------------
// exports
//

module.exports = router;

// -------------------------------------------------------------------------------------
//  Helper Functions
//


