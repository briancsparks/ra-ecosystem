#!/bin/bash -e

# echo "qlep profile profile: $AWS_PROFILE verbose: $VERBOSE skipLayer: $SKIP_LAYER ========================================================================================"

[[ -z $LAMBDA_NAME ]] && (echo "Must provide LAMBDA_NAME" && exit 113)
[[ -z $BUCKET_NAME ]] && (echo "Must provide BUCKET_NAME" && exit 113)

LAYER_NAME="layer-for-$LAMBDA_NAME"

export AWS_SHARED_CREDENTIALS_FILE="/aws/credentials"
export AWS_CONFIG_FILE="/aws/config"

cd /work/opt


# -------------------------------------------------------------------------------
# ----- Build the function -----
[[ -n $VERBOSE ]] && echo "Building main function..." 2>&1

cp -r   /src/*              /work/opt/nodejs/
rm -rf                      /work/opt/nodejs/node_modules
cat     /src/package.json \
          | jq 'del(.dependencies) + {dependencies:{}}' > /work/opt/nodejs/package.json

# Pack it into zip file
(cd nodejs && claudia pack --output /work/package.zip)

# -------------------------------------------------------------------------------
# ----- Build the dependency layer -----
[[ -n $VERBOSE ]] && echo "Building layer? ${SKIP_LAYER}" 2>&1

if [[ -z $SKIP_LAYER ]]; then
  [[ -n $VERBOSE ]] && echo "Building layer." 2>&1

  rm -rf                    /work/opt/nodejs   && mkdir -p $_
  cp    /src/package.json   /work/opt/nodejs

  (cd nodejs && yarn --production --silent)

  # Pack it into zip file
  zip -r /work/layer-for-package.zip nodejs

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
  echo "$layer_arn"

  aws s3 cp /src/package.json "s3://${BUCKET_NAME}/quick-net/lambda-layers/${LAYER_NAME}/"
fi


if [[ -z $CLAUDIA_DEPLOY ]]; then
  # -------------------------------------------------------------------------------
  # ----- Publish the functions -----
  printf "\nPublishing source file\n"
  ls -l /work/package.zip

  aws s3 cp /work/package.zip             "s3://${BUCKET_NAME}/quick-net/lambdas/${LAMBDA_NAME}/"

  aws lambda update-function-code  --function-name "$LAMBDA_NAME-public-express"  --zip-file "fileb:///work/package.zip" | jq -r '.FunctionArn'
  aws lambda update-function-code  --function-name "$LAMBDA_NAME"                 --zip-file "fileb:///work/package.zip" | jq -r '.FunctionArn'

  if [[ -n $layer_arn ]]; then
    printf "\nAttaching layer ${layer_arn} to:\n"
    aws lambda update-function-configuration --function-name "$LAMBDA_NAME-public-express"   --layers $layer_arn | jq -r '.FunctionArn'
    aws lambda update-function-configuration --function-name "$LAMBDA_NAME"                  --layers $layer_arn | jq -r '.FunctionArn'
  fi

else

  # -------------------------------------------------------------------------------
  # ----- Build the function -----
  [[ -n $VERBOSE ]] && echo "Building main function again..." 2>&1
  printf "\nDeploying with Claudia\n"

  rm -rf                      /work/opt/nodejs   && mkdir -p $_

  cp -r   /src/*              /work/opt/nodejs/
  rm -rf                      /work/opt/nodejs/node_modules
  cat     /src/package.json \
            | jq 'del(.dependencies) + {dependencies:{}}' > /work/opt/nodejs/package.json

  EXTRA_ARGS=""
  [[ -n $layer_arn ]] && EXTRA_ARGS="$EXTRA_ARGS --layers $layer_arn"

  # Update
  echo claudia update --config _config/${STAGE_NAME}/public/claudia.json  --set-env-from-json _config/${STAGE_NAME}/env.json $EXTRA_ARGS
  cat nodejs/_config/${STAGE_NAME}/public/claudia.json
  cat nodejs/_config/${STAGE_NAME}/env.json

  (cd nodejs && claudia update --config _config/${STAGE_NAME}/public/claudia.json  --set-env-from-json _config/${STAGE_NAME}/env.json $EXTRA_ARGS)
  echo "Just done with first claudia update"

  # Update
  echo claudia update --config /src/_config/${STAGE_NAME}/private/claudia.json  --set-env-from-json /src/_config/${STAGE_NAME}/env.json $EXTRA_ARGS
  cat nodejs/_config/${STAGE_NAME}/private/claudia.json
  cat nodejs/_config/${STAGE_NAME}/env.json

  (cd nodejs && claudia update --config /src/_config/${STAGE_NAME}/private/claudia.json --set-env-from-json /src/_config/${STAGE_NAME}/env.json $EXTRA_ARGS)
fi



# exec "$@"
