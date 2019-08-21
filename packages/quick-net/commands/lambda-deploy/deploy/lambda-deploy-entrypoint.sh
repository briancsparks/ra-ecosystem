#!/bin/bash -e

LAYER_NAME="layer-for-$LAMBDA_NAME"

export AWS_SHARED_CREDENTIALS_FILE="/aws/credentials"
export AWS_CONFIG_FILE="/aws/config"

AWS_ACCT="$(aws sts get-caller-identity | jq -r '.Account')"

# ---------------------------------
# ----- Build source          -----
printf "\nBuilding source\n"

cp -r   /src/*              /work/opt/nodejs/
rm -rf                      /work/opt/nodejs/node_modules
cat     /src/package.json \
          | jq 'del(.dependencies) + {dependencies:{}}' > /work/opt/nodejs/package.json

# ---------------------------------
# ----- Pack it into zip file -----
printf "\nPack source into zip file\n"
(cd /work/opt/nodejs && claudia pack --output /work/package.zip)

# ---------------------------------
# ----- Put zip onto S3       -----
printf "\nPutting zip onto S3\n"
aws s3 cp /work/package.zip             "s3://${BUCKET_NAME}/quick-net/lambdas/${LAMBDA_NAME}/"

# ---------------------------------
# ----- Create or update      -----
if ! aws lambda list-functions | jq -r ".Functions[].FunctionArn" | egrep ":${LAMBDA_NAME}"; then

  # ---------------------------------
  # ----- Creating Function     -----
  printf "\nCreating Function?\n"

  aws lambda create-function \
      --function-name "arn:aws:lambda:us-east-1:${AWS_ACCT}:function:${LAMBDA_NAME}:\$LATEST" \
      --runtime "nodejs10.x" \
      --role "arn:aws:iam::${AWS_ACCT}:role/${LAMBDA_NAME}-instance-role" \
      --handler "lambda.handler" \
      --code "S3Bucket=${BUCKET_NAME},S3Key=quick-net/lambdas/${LAMBDA_NAME}/package.zip" \
      --description "${LAMBDA_NAME}" \
      --timeout 12 \
      --memory-size "128" \
      --vpc-config "SubnetIds=${subnet_ids},SecurityGroupIds=${sg_ids}"

  # Now, we have to attach the layer
  LAYER_ARN="$(aws lambda list-layers | jq -r ".Layers[].LatestMatchingVersion.LayerVersionArn" | egrep ":${LAYER_NAME}:")"
  # echo "layerarn | $LAYER_ARN |"

  if [[ -n $LAYER_ARN ]]; then
    printf "\nAttaching layer ${LAYER_ARN}\n"
    aws lambda update-function-configuration --function-name "$LAMBDA_NAME" --layers $LAYER_ARN | jq -r '.FunctionArn'
  fi

else
  # ---------------------------------
  # ----- Updating code         -----
  printf "\nUpdating code\n"
  aws lambda update-function-code  --function-name "$LAMBDA_NAME" --zip-file "fileb:///work/package.zip" | jq -r '.FunctionArn'
fi




# layer_arn="$(cat publish-layer-version-result.json | jq -r '.LayerVersionArn')"
# echo "Layer ARN: | $layer_arn |"



