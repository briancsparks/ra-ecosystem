# MongDB Instances

```sh
quick-net upsertInstance --distro=ubuntu \
    --image=ami-03a935aafa6b52b97 \
    --type=m5.xlarge \
    --key=example \
    --classB=13 \
    --sgs=db \
    --subnet=db \
    --az=c \
    --envjson="_config/dev/env.json"
```
