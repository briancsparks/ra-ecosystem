# Starting Instances

## Launching

Web servers

```sh
quick-net upsertInstance \
    --distro=ubuntu \
    --type=c5n.xlarge \
    --key=example \
    --classB=113 \
    --az=c \
    --envjson="_config/dev/env.json" \
    --sgs=web \
    --subnet=webtier
```

Admin machines

```sh
quick-net upsertInstance \
    --distro=ubuntu \
    --type=t3.medium \
    --key=example \
    --classB=113 \
    --az=c \
    --envjson="_config/dev/env.json" \
    --iam=supercow \
    --sgs=admin,wide \
    --subnet=webtier
```

Where env.json is something like this, and will get added to /etc/environment, for example.

```json
{
  "NAMESPACE": "ExampleNamespace",
  "NS": "expl",
  "AWS_ACCT_TYPE":"dev",
  "NODE_ENV":"production",
  "db":"10.113.52.168",
  "dbr":"10.113.52.168",
  "dbw":"10.113.52.168",
  "redis":"10.113.55.152",
  "redis_port":"6379",
  "util":"10.113.55.152",
  "utilr":"10.113.55.152",
  "utilw":"10.113.55.152",
  "IngestBucket": "example-dev",
  "IngestKeyPrefix": "",
  "UploadBucket": "example-dev",
  "UploadKeyPrefix": "/in",
  "DeployBucket": "example-dev",
  "DeployKeyPrefix": "/buildout/debs",
  "key":"key_demo",
  "azs":["c", "a", "e"],
  "classB":113
}
```
