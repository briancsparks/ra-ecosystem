#!/bin/bash -e

scripts_dir="$(dirname $0)"

#echo "auth" "$@"
#env | egrep CERTBOT

node "${scripts_dir}/certbot-route53-auth-hook.js" "$@"


