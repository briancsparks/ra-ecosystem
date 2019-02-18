# Managing Subnets and Security Groups

## Getting SGs and Subnets

To have lambda functions and instances, they need to know what subnet to run on, and
what security group(s) that will be applied.

* All the subnets in the general worker area, all zones.
* The `lambda` sg, and the `wide` sg.
  * You have to run twice to get both sgs.

```sh
quick-net getSubnets --classB=113 --sgName=lambda --subnetName=worker --azLetter=a,c,e --ids --machine | jq '.'
quick-net getSubnets --classB=113 --sgName=wide --subnetName=worker --azLetter=a,c,e --ids --machine | jq '.'
```

## The response

```json
{
  "subnets": [
    {
      "SubnetId": "subnet-123abc4567890def",
      "AvailabilityZone": "us-east-1e"
    },
    {
      "SubnetId": "subnet-123abc4567890de1",
      "AvailabilityZone": "us-east-1a"
    },
    {
      "SubnetId": "subnet-123abc4567890de2",
      "AvailabilityZone": "us-east-1c"
    }
  ],
  "securityGroups": [
    "sg-123abc4567890def"
  ]
}
```
