#!/bin/bash -e

LAYER_NAME="layer-for-$LAMBDA_NAME"

export AWS_SHARED_CREDENTIALS_FILE="/aws/credentials"
export AWS_CONFIG_FILE="/aws/config"

AWS_ACCT="$(aws sts get-caller-identity | jq -r '.Account')"

# ---------------------------------
# ----- Build source          -----
printf "\nBuilding source\n"
SECONDS=0

rsync -av --progress   /src/  /work/opt/nodejs                --exclude node_modules
cat     /src/package.json \
          | jq 'del(.dependencies) + {dependencies:{}}' > /work/opt/nodejs/package.json
tree    /work/opt

printf "\n ---------- Building source took %d seconds\n" $SECONDS

# ---------------------------------
# ----- Pack it into zip file -----
printf "\nPack source into zip file\n"
SECONDS=0
(cd /work/opt/nodejs && claudia pack --output /work/package.zip)

printf "\n ---------- Pack source into zip file took %d seconds\n" $SECONDS

# ---------------------------------
# ----- Put zip onto S3       -----
printf "\nPutting zip onto S3\n"
SECONDS=0
aws s3 cp /work/package.zip             "s3://${BUCKET_NAME}/quick-net/lambdas/${LAMBDA_NAME}/"

printf "\n ---------- Putting zip onto S3 took %d seconds\n" $SECONDS

# ---------------------------------
# ----- Create or update      -----
if ! aws lambda list-functions | jq -r ".Functions[].FunctionArn" | egrep ":${LAMBDA_NAME}"; then

  # ---------------------------------
  # ----- Creating Function     -----
  printf "\nCreating Function?\n"
  SECONDS=0

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

  printf "\n ---------- Creating Function took %d seconds\n" $SECONDS

else
  # ---------------------------------
  # ----- Updating code         -----
  printf "\nUpdating code\n"
  SECONDS=0
  aws lambda update-function-code  --function-name "$LAMBDA_NAME" --zip-file "fileb:///work/package.zip" | jq -r '.FunctionArn'

  printf "\n ---------- Updating code took %d seconds\n" $SECONDS

fi

# Now, we have to attach the layer
LAYER_ARN="$(aws lambda list-layers | jq -r ".Layers[].LatestMatchingVersion.LayerVersionArn" | egrep ":${LAYER_NAME}:")"

if [[ -n $LAYER_ARN ]]; then
  printf "\nAttaching layer ${LAYER_ARN}\n"
  SECONDS=0
  aws lambda update-function-configuration --function-name "$LAMBDA_NAME" --layers $LAYER_ARN | jq -r '.FunctionArn'

  printf "\n ---------- Attaching layer ${LAYER_ARN} took %d seconds\n" $SECONDS

fi

printf "\nAdding env\n"
SECONDS=0
aws lambda update-function-configuration --function-name "$LAMBDA_NAME" --environment "{\"Variables\":$(cat $ENVIRONMENT_FILE)}"

printf "\n ---------- Adding env took %d seconds\n" $SECONDS

