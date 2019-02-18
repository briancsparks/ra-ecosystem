# Managing Lambdas

## Using Claudia.js to Build Out

You end up making 4 lambdas, each with 2 stages. The lambdas are managed by AWS
lambda, and the stages are managed by AWS API Gateway.

* Development account
  * private
    * `/dev` endpoint
    * `/latest` endpoint
  * public
    * `/dev` endpoint
    * `/latest` endpoint
* Prod account
  * private
    * `/prod` endpoint
    * `/latest` endpoint
  * public
    * `/prod` endpoint
    * `/latest` endpoint

### Development, Private `/latest`

Claudia calls their API endpoint manager "api-builder". To create the development
private `/latest` endpoint:

```sh
claudia create --api-module api-builder \
    --name Example \
    --config "_config/dev/private/claudia.json" \
    --role arn:aws:iam::1234567890:role/example-instance-role \
    --memory 128 \
    --timeout 30 \
    --security-group-ids sg-123abc4567890def,sg-123abc4567890de1 \
    --subnet-ids subnet-123abc4567890def,subnet-123abc4567890de1,subnet-123abc4567890de2 \
    --set-env-from-json "_config/dev/env.json" \
    --region us-east-1
```

### Development, Private `/dev`

```sh
claudia update --config "_config/dev/private/claudia.json" --version dev
```

### Development, Public `/latest`

```sh
claudia create --handler lambda.handler \
    --deploy-proxy-api \
    --name Netlab3-public-express \
    --config "_config/dev/public/claudia.json" \
    --role arn:aws:iam::1234567890:role/example-instance-role \
    --memory 128 \
    --timeout 30 \
    --keep \
    --security-group-ids sg-123abc4567890def,sg-123abc4567890de1 \
    --subnet-ids subnet-123abc4567890def,subnet-123abc4567890de1,subnet-123abc4567890de2 \
    --set-env-from-json "_config/dev/env.json" \
    --region us-east-1
```

### Development, Public `/dev`

```sh
claudia update --config "_config/dev/public/claudia.json" --version dev
```

### Production

The commands for the production account is very similar.
