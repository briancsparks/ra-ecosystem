# Deployment

```sh
quick-net getVpcSubnetsSgs --class-b=21 --sgs=wide > /tmp/vpcsubnetsgs.json

aws lambda create-function \
    --function-name "arn:aws:lambda:us-west-2:${AWS_ACCT}:function:lambda-net" \
    --runtime "nodejs10.x" \
    --role "lambda-net-instance-role" \
    --handler "lambda.handler" \
    --code "S3Bucket=netlab-dev,S3Key=lambda-net.zip" \
    --description "lambda-net" \
    --timeout 12 \
    --memory-size "128MB" \
    --vpc-config "SubnetIds=subnet-09620c2e25e65dc27,SecurityGroupIds=sg-082b1fbd06ea8b5cb"

```
