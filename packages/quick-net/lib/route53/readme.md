# Stoopid Route53 Tricks

## Delete Record

```sh
aws route53 change-resource-record-sets --hosted-zone-id ZGFBEAK36D73U --change-batch "`aws route53 list-resource-record-sets --hosted-zone-id  ZGFBEAK36D73U | jq '.ResourceRecordSets[] | select(.Type == "A") | select(.Name == "api.cdr0.net.") | {Changes:[{Action:"DELETE",ResourceRecordSet: .}]}'`"
```

First, you have to get the exact record from Route 53. Do not try to build it yourself.
