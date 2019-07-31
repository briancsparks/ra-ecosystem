
# Scaling in and shutting down a cluster

## Scale deployments to zero

Change `replicas` in all the `deployment.yaml` files, then deploy them to scale all
pods to zero.

```sh
kubectl apply -k "lib/k8s/config/overlays/development/" --record

# or
node scripts/kapply.js
```

Then watch as the deployments go to zero:

```sh
watch kubectl get deployments
```

## Scale nodes to zero

This actually takes longer that it seems at first. The `kops validate cluster` command will
show the changes immediately, but AWS will not scale it down for a while. Look at the AWS
console.

```sh
kops edit ig "nodes"      # min and max to zero
kops update cluster --yes && kops rolling-update cluster --yes

# watch
watch kops validate cluster
```

To see what resources:

```sh
kops delete cluster
```
