
# Restarting a cluster

When restarting, there will only be one master running.

1. Scale up worker nodes, wait for the cluster to come up.
2. Start services

## 1. Scale up workers

```sh
kops edit ig "nodes"

# Change minSize and maxSize

# Roll out changes
kops update cluster --yes
kops rolling-update cluster --yes

# Watch it roll out
watch kops validate cluster
```

## 2. Start services

First, start the DB.

Modify `datatier/deployment.yaml` and set `replicas` for the DB to 1. Then rollout the change.

```sh
kubectl apply -k lib/k8s/config/overlays/development/ --record

# To see status
kubectl get deployments -o json | jq '.items[].status'

# To see summary
kubectl get deployments
```

Then, modify the other `deployment.yaml` files to set replicas. and do the apply above again.
