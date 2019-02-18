# Starting Instances

## Launching

Web servers

```sh
quick-net upsertInstance --distro=ubuntu \
    --image=ami-03a935aafa6b52b97 \
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
    --image=ami-03a935aafa6b52b97 \
    --type=t3.medium \
    --key=example \
    --classB=13 \
    --az=c \
    --envjson="_config/dev/env.json" \
    --iam=supercow \
    --sgs=admin,wide \
    --subnet=webtier
```
