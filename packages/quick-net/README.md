# quick-net

* Generate VPC and topology -- `quick-net manageVpc ...`
  * Subnets
  * Route Tables
  * Internet Gateways
  * Endpoints (both types)
  * NAT Gateways **
  * Security Groups

## Usage

```js
const quickNet = require('quick-net');

// TODO: DEMONSTRATE API
```

### Command -- manageVpc

```sh
ra invoke2 commands\vpcs.js manageVpc --program=qnettest --az=c     --classB=21   --skip-nat --skip-endpoint-services
quick-net manageVpc --program=program --namespace=xyz --az=c,a,d --classB=11  --skip-nat --skip-endpoint-services
```

## Code Map

* quick-net CLI command `./bin/quick-net.{js,ps1}`
  * Run any RA function from `./lib/ra-modules.js`.
  * `buildLayer`
    * `./commands/lambda-deploy/layer.js`
  * `deployLambda`
    * `./commands/lambda-deploy/deploy.js`
* quick-lambda CLI command -- The old docker-based lambda builder
  * ./bin/quick-lambda.{js,ps1}
  * ./bin/quick-lambda/...

## Other Various Info

`./lib/ra-modules.js` holds the mapping of the run-anywhere functions.

Currently, the RA style functions are:

* manageVpc() -- Create and manage VPCs and VPC components.
* getVpcSubnetsSgs() -- Get IDs for VPC, Subnets, Security Groups
* pushDataPtr
* pushData
* pushAction
* readData
* pushStatus
* createConfigMap
* \_createConfigMap_
* buildLayer
* deployLambda
* launchInfo
* upsertInstance
* getAmis
