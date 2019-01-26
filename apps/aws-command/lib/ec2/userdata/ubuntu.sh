#!/bin/bash -e

if ! grep `hostname` /etc/hosts; then
  echo "127.0.0.1 `hostname`" >> /etc/hosts
fi

osversion="$(lsb_release -c | awk '{print $2}')"

curl -sS https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -

# Add nodesource to our sources
echo "deb https://deb.nodesource.com/node_8.x ${osversion} main" | tee /etc/apt/sources.list.d/nodesource.list

# Now that we know about nodesource's repos, install node
DEBIAN_FRONTEND=noninteractive apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs ntp tree htop

DEBIAN_FRONTEND=noninteractive apt-get update

# npm install -g pm2 aws-sdk run-anywhere sg0 sg-flow sg-argv quick-merge lodash
npm install -g pm2
