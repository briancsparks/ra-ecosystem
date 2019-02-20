# Starting Instances

## Launching

Web servers

```sh
quick-net upsertInstance --distro=ubuntu \
    --image="ami-0565af6e282977273" \
    --type=c5n.xlarge \
    --key=example \
    --classB=13 \
    --az=c \
    --envjson="_config/dev/env.json" \
    --sgs=web \
    --subnet=webtier
```

Admin machines

```sh
quick-net upsertInstance --distro=ubuntu \
    --image="ami-0565af6e282977273" \
    --type=t3.medium \
    --key=example \
    --classB=13 \
    --az=c \
    --envjson="_config/dev/env.json" \
    --iam=supercow \
    --sgs=admin,wide \
    --subnet=webtier
```
