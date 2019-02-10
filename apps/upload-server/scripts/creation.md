# Creation

```sh
claudia create --api-module api-builder --name upload --version dev --config _config\dev\private\claudia.json --role arn:aws:iam::084075158741:role/supercow --memory 128 --timeout 30 --security-group-ids sg-097d5424b2bd94f7d --subnet-ids subnet-0a01766491ff4091b,subnet-038ade74fb771f294 --set-env-from-json _config\dev\env.json --layers arn:aws:lambda:us-east-1:084075158741:layer:run-anywhere-layer:2 --region us-east-1 --use-s3-bucket netlab-dev --keep

npm install -q --no-audit --production
npm dedupe -q --no-package-lock
zipping package
```

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
claudia create --handler lambda.handler --deploy-proxy-api --name upload-public-express --version dev --config _config\dev\public\claudia.json --role arn:aws:iam::084075158741:role/supercow --memory 128 --timeout 30 --keep --security-group-ids sg-097d5424b2bd94f7d --subnet-ids subnet-0a01766491ff4091b,subnet-038ade74fb771f294 --set-env-from-json _config\dev\env.json --layers arn:aws:lambda:us-east-1:084075158741:layer:run-anywhere-layer:2 --region us-east-1 --use-s3-bucket netlab-dev

```

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
3. Copy the private `claudia.json` file into `lambda-invoke/claudia.json`, so you can push new code without messing up all the sources

an update:
claudia update  --config _config\dev\lambda-invoke\claudia.json --use-s3-bucket netlab-dev --keep
```sh

```
