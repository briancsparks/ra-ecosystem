# MongDB Instances

```sh
quick-net upsertInstance --distro=ubuntu \
    --image="ami-0565af6e282977273" \
    --type=m5.xlarge \
    --key=example \
    --classB=13 \
    --sgs=db \
    --subnet=db \
    --az=c \
    --envjson="_config/dev/env.json"
```
