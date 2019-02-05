
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
const routes                  = require('./express-routes');
const express                 = ra.get3rdPartyLib('express');

const app                     = express();

// -------------------------------------------------------------------------------------
//  Data
//

// const collNames               = 'clients,sessions,users,telemetry,attrstream,logs'.split(',');
// const dbName                  = process.env.DB_NAME || 'ntl';


// -------------------------------------------------------------------------------------
//  Functions
//

// Hook into host
// app.use(ra.raExpressMw(dbName, collNames));

routes.addRoutes(app);

module.exports = app;

const port = 3003;
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

// -------------------------------------------------------------------------------------
//  Helper Functions
//

