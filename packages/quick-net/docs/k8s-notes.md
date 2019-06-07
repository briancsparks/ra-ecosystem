# Notes from Setting Up K8s for Mario

See also: https://github.com/kubernetes/kops/blob/master/docs/run_in_existing_vpc.md

## Using `kops` to Setup Cluster at AWS

_Installing_

```sh
curl -L https://github.com/kubernetes/kops/releases/download/$(curl -s https://api.github.com/repos/kubernetes/kops/releases/latest | jq -r '.tag_name')/kops-linux-amd64 > kops
chmod +x kops
sudo mv kops /usr/local/bin
```

-------------------------------------------------------------------------------

_Setup Environment_
net
Set the following variables.

```sh
export KOPS_STATE_STORE="s3://subdomain-example-com-state-store"
export KOPS_CLUSTER_NAME="subdomain.example.com"
```

-------------------------------------------------------------------------------

_Setup DNS / Route 53_

I don't remember exactly what I did, but I created a sub-domain for this cluster, and somehow
associated it with the main domain name that Route 53 was already managing.

In these instructions, I use:

* Domain: `example.com`
* Subdomain: `subdomain`

See: https://github.com/kubernetes/kops/blob/master/docs/aws.md

-------------------------------------------------------------------------------

_Setup IAM_

This is what I executed when following the instructions from the `kops` setup guide. (The items
that are commented out were also run.)

```sh
aws iam create-group  --group-name kops
aws iam attach-group-policy --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess --group-name kops
aws iam attach-group-policy --policy-arn arn:aws:iam::aws:policy/AmazonRoute53FullAccess --group-name kops
aws iam attach-group-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess --group-name kops
#aws iam attach-group-policy --policy-arn arn:aws:iam::aws:policy/IAMFullAccess --group-name kops
aws iam attach-group-policy --policy-arn arn:aws:iam::aws:policy/AmazonVPCFullAccess --group-name kops
#aws iam create-user --user-name kops
#aws iam add-user-to-group --user-name kops --group-name kops
#aws iam create-access-key --user-name kops
```

However, it seems like only the non-commented out items should be necessary.

1. IAMFullAccess should not be necessary for long-term function of kops. I think it was only
   included in the guide because it is required for the subsequent commands in this list.
2. Should not create a new user; should have an already-existing user that gets added to the
   group. So, a new access key would also not be needed.

I also setup permissions to use ECR, but I do not have the list.

-------------------------------------------------------------------------------

_Make S3 Storage_

```sh
export bucketname="$(echo $KOPS_STATE_STORE | sed 's~^s3://~~')"
aws s3api create-bucket --bucket "$bucketname" --region us-east-1
aws s3api put-bucket-versioning --bucket "$bucketname" --versioning-configuration Status=Enabled
```

-------------------------------------------------------------------------------

_Creating the Cluster_

```sh
# Create the cluster
kops create cluster --zones us-east-1c --yes

# Setup keys
kops create secret sshpublickey admin -i ~/.ssh/id_rsa.pub

# Update
kops update cluster --yes

# Watch it being built
kops validate cluster
```

```sh
# Or leverage an already-existing VPC (make sure, for example, that '...1c' is the first zone for the master to be in that subnet)
kops create cluster --zones=us-east-1c,us-east-1a,us-east-1e --vpc=vpc-123abc --subnets=subnet-123abc,subnet-456def,subnet-789ghi
```

Then, as needed:

```sh
kops edit cluster
kops update cluster --yes
kops get cluster
#kops delete cluster --yes
```

Notes:

* My history does not have `--yes` on the `create secret` command, but it is probably
  necessary.
* `get cluster` is a quick one-lineer,
* `validate cluster` gives details
* `update cluster` rolls out changes to the cluster.
* `edit cluster` -- I do not know if this only changes the cluster specs (I think so), or
  if it also rolls out changes (I think not).
