#!/bin/bash -e

[[ -z $LAMBDA_NAME ]] && (echo "Must provide LAMBDA_NAME" && exit 2)

cd /work/opt

# ----- Build the function -----
cp -r   /src/*              /work/opt/nodejs/
rm -rf                      /work/opt/nodejs/node_modules
cat     /src/package.json \
          | jq 'del(.dependencies) + {dependencies:{}}' > /work/opt/nodejs/package.json

# Pack it into zip file
(cd nodejs && claudia pack --output /work/package.zip)

# ----- Build the dep layer -----
if [[ -z $SKIP_LAYER ]]; then
  rm -rf                    /work/opt/nodejs   && mkdir -p $_
  cp    /src/package.json   /work/opt/nodejs

  (cd nodejs && yarn --production --silent)
fi

# Pack it into zip file
# zip -r /work/layer-for-package.zip /work/opt/nodejs
zip -r /work/layer-for-package.zip nodejs

export AWS_SHARED_CREDENTIALS_FILE="/aws/credentials"
export AWS_CONFIG_FILE="/aws/config"
# aws s3 cp /work/package.zip             s3://netlab-dev/lookieame-package.zip
# aws s3 cp /work/layer-for-package.zip   s3://netlab-dev/lookieame-layer-for-package.zip

# ----- Publish the dep layer -----
if [[ -z $SKIP_LAYER ]]; then
  printf "\nPublishing layer file\n"
  ls -l /work/layer-for-package.zip

  aws lambda publish-layer-version  --layer-name "layer-for-$LAMBDA_NAME"                     \
                                    --description "dependencies for $LAMBDA_NAME function"    \
                                    --zip-file "fileb:///work/layer-for-package.zip"                \
                                    --compatible-runtimes "nodejs8.10" > "publish-layer-version-result.json"

  layer_arn="$(cat publish-layer-version-result.json | jq -r '.LayerVersionArn')"
  echo "$layer_arn"
fi



# ----- Publish the functions -----
printf "\nPublishing source file\n"
ls -l /work/package.zip

aws lambda update-function-code  --function-name "$LAMBDA_NAME-public-express"  --zip-file "fileb:///work/package.zip" | jq -r '.FunctionArn'
aws lambda update-function-code  --function-name "$LAMBDA_NAME"                 --zip-file "fileb:///work/package.zip" | jq -r '.FunctionArn'

if [[ -n $layer_arn ]]; then
  printf "\nAttaching layer ${layer_arn} to:\n"
  aws lambda update-function-configuration --function-name "$LAMBDA_NAME-public-express"   --layers $layer_arn | jq -r '.FunctionArn'
  aws lambda update-function-configuration --function-name "$LAMBDA_NAME"                  --layers $layer_arn | jq -r '.FunctionArn'
fi

# exec "$@"
