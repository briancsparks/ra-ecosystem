


// TODO: Dont forget about creating the volume for MongoDB
// See: https://github.com/kubernetes/examples/tree/master/staging/nodesjs-mongodb
// Something like: ec2-create-volume --size 200 --region $REGION --availability-zone $ZONE
// Or: aws ec2 create-volume --size 80 --region us-east-1 --availability-zone us-east-1a --volume-type gp2
//   with tags: --tag-specifications 'ResourceType=volume,Tags=[{Key=purpose,Value=production},{Key=cost-center,Value=cc123}]'
