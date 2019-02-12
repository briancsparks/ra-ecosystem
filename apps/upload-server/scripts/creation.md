# Creation

```sh
claudia create --api-module api-builder \
    --name upload \
    --config _config\dev\private\claudia.json \
    --role arn:aws:iam::084075158741:role/supercow \
    --memory 128 \
    --timeout 30 \
    --security-group-ids sg-097d5424b2bd94f7d \
    --subnet-ids subnet-0a01766491ff4091b,subnet-038ade74fb771f294 \
    --set-env-from-json _config\dev\env.json \
    --layers arn:aws:lambda:us-east-1:084075158741:layer:run-anywhere-layer:2 \
    --region us-east-1 \
    --use-s3-bucket netlab-dev --keep

npm install -q --no-audit --production
npm dedupe -q --no-package-lock
zipping package
```

Then run it again, with `--version dev`

```json
{
  "lambda": {
    "role": "arn:aws:iam::084075158741:role/supercow",
    "name": "upload",
    "region": "us-east-1",
    "sharedRole": true
  },
  "api": {
    "id": "twcc01slvf",
    "module": "api-builder",
    "url": "https://twcc01slvf.execute-api.us-east-1.amazonaws.com/dev"
  },
  "s3key": "891672e3-2662-4241-b61f-ad892439882c.zip",
  "archive": "C:\\Users\\sparksb\\AppData\\Local\\Temp\\891672e3-2662-4241-b61f-ad892439882c.zip"
}
```




```sh
claudia create --handler lambda.handler --deploy-proxy-api --name upload-public-express --config _config\dev\public\claudia.json --role arn:aws:iam::084075158741:role/supercow --memory 128 --timeout 30 --keep --security-group-ids sg-097d5424b2bd94f7d --subnet-ids subnet-0a01766491ff4091b,subnet-038ade74fb771f294 --set-env-from-json _config\dev\env.json --layers arn:aws:lambda:us-east-1:084075158741:layer:run-anywhere-layer:2 --region us-east-1 --use-s3-bucket netlab-dev

```

Then run it again, with `--version dev`


```json
{
  "lambda": {
    "role": "arn:aws:iam::084075158741:role/supercow",
    "name": "upload-public-express",
    "region": "us-east-1",
    "sharedRole": true
  },
  "api": {
    "id": "q0puwpj89f",
    "url": "https://q0puwpj89f.execute-api.us-east-1.amazonaws.com/dev"
  },
  "s3key": "bcceeca2-1da6-47f4-9924-60af84b4db54.zip",
  "archive": "C:\\Users\\sparksb\\AppData\\Local\\Temp\\bcceeca2-1da6-47f4-9924-60af84b4db54.zip"
}
```

1. Go to the public lambda function, and copy the `Handler`; Paste it into the private function.
2. Go to the public api-gateway, and change `xyz-public-express:${stageVariables.lambdaVersion}` to `xyz:${stageVariables.lambdaVersion}` in 4 places.
3. Go to the public api-gateway, and change `xyz-public-express:${stageVariables.lambdaVersion}` to `xyz:latest` in one place. You should be
   prompted by API Gateway to allow permissions. Allow them.
4. Go to the public api-gateway, and change `xyz-public-express:${stageVariables.lambdaVersion}` to `xyz:dev` in one place. You should be
   prompted by API Gateway to allow permissions. Allow them.

an update:

```sh
# Not on Windows
quick-net/bin/layer-deps --package=path/to/a/dir/containing/a/packagejson --name=name [--push --push-both --push-layer]
```

Outdated:

```sh
claudia update  --config _config\dev\lambda-invoke\claudia.json --use-s3-bucket netlab-dev --keep
```


```json
{
  "FunctionName": "upload",
  "FunctionArn": "arn:aws:lambda:us-east-1:084075158741:function:upload:2",
  "Runtime": "nodejs8.10",
  "Role": "arn:aws:iam::084075158741:role/supercow",
  "Handler": "lambda.handler",
  "CodeSize": 11308165,
  "Description": "A server using run-anywhere that receives a file uplaod from the client and stores on S3",
  "Timeout": 30,
  "MemorySize": 128,
  "LastModified": "2019-02-10T23:02:30.618+0000",
  "CodeSha256": "B2Tbo+KPcKL22WvP3PtlnoVg49facEfw3/+I8HjLM4M=",
  "Version": "2",
  "VpcConfig": {
    "SubnetIds": [
      "subnet-0a01766491ff4091b",
      "subnet-038ade74fb771f294"
    ],
    "SecurityGroupIds": [
      "sg-097d5424b2bd94f7d"
    ],
    "VpcId": "vpc-05acf72c049370751"
  },
  "Environment": {
    "Variables": {
      "AWS_ACCT_TYPE": "dev",
      "Bucket": "netlab-dev-ingest",
      "NAMESPACE": "uploader",
      "NS": "up"
    }
  },
  "KMSKeyArn": null,
  "TracingConfig": {
    "Mode": "PassThrough"
  },
  "MasterArn": null,
  "RevisionId": "b582b3ba-80cf-492c-aefc-77a4b1540b3f",
  "Layers": [
    {
      "Arn": "arn:aws:lambda:us-east-1:084075158741:layer:run-anywhere-layer:2",
      "CodeSize": 9442385
    }
  ],
  "s3key": "4888fc48-6246-4e2b-b326-372914e8004f.zip",
  "archive": "C:\\Users\\sparksb\\AppData\\Local\\Temp\\4888fc48-6246-4e2b-b326-372914e8004f.zip"
}
```
