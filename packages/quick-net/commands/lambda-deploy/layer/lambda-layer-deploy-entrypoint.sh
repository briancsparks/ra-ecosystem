#!/bin/bash -e


LAYER_NAME="layer-for-$LAMBDA_NAME"

export AWS_SHARED_CREDENTIALS_FILE="/aws/credentials"
export AWS_CONFIG_FILE="/aws/config"

# ---------------------------------
# ----- Build layer           -----
printf "\nBuilding layer\n"
cd /work/opt

rm -rf                    /work/opt/nodejs   && mkdir -p $_
cp    /src/package.json   /work/opt/nodejs

(cd nodejs && yarn --production --silent)

# ---------------------------------
# ----- Pack it into zip file -----
printf "\nPack source into zip file\n"
zip -r /work/layer-for-package.zip nodejs

# ---------------------------------
# ----- Put zip onto S3       -----
printf "\nPutting zip onto S3\n"
aws s3 cp /work/layer-for-package.zip   "s3://${BUCKET_NAME}/quick-net/lambda-layers/${LAYER_NAME}/"

# ---------------------------------
# ----- Publish the dep layer -----
printf "\nPublishing layer file\n"
ls -l /work/layer-for-package.zip

aws lambda publish-layer-version  --layer-name "$LAYER_NAME"                     \
                                  --description "dependencies for $LAMBDA_NAME function"    \
                                  --zip-file "fileb:///work/layer-for-package.zip"                \
                                  --compatible-runtimes "nodejs8.10" > "publish-layer-version-result.json"

layer_arn="$(cat publish-layer-version-result.json | jq -r '.LayerVersionArn')"
echo "Layer ARN: | $layer_arn |"

aws s3 cp /src/package.json "s3://${BUCKET_NAME}/quick-net/lambda-layers/${LAYER_NAME}/"


