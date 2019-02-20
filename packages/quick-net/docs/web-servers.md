# Web Servers

## Launching

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
