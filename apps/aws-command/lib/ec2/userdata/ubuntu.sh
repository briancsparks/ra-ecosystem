#!/bin/bash -ex

# Things to install
APT_PACKAGES="ntp tree htop"
NODE_UTILS=""

# What utils should be installed?
INSTALL_DOCKER="1"
INSTALL_OPS="1"                   # Make easier to use day-to-day

# TODO: put back
unset INSTALL_DOCKER

# AAAArrrrrrggggggghhhhhhh!!!!!!!!!!!
if ! grep `hostname` /etc/hosts; then
  echo "127.0.0.1 `hostname`" >> /etc/hosts
fi

# Some macros
osversion="$(lsb_release -c | awk '{print $2}')"
the_user_name="ubuntu"
the_home_dir="/home/${the_user_name}"
user_docker_conf_dir="${the_home_dir}/.docker"

env

# Install apt-over-https
# DEBIAN_FRONTEND=noninteractive apt-get update
# DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common

# Add nodesource to our sources
curl -sSL "https://deb.nodesource.com/gpgkey/nodesource.gpg.key" | apt-key add -
echo "deb https://deb.nodesource.com/node_8.x ${osversion} main" | tee /etc/apt/sources.list.d/nodesource.list
APT_PACKAGES="${APT_PACKAGES} nodejs"
# NODE_UTILS="${NODE_UTILS} pm2 aws-sdk run-anywhere sg0 sg-flow sg-argv quick-merge lodash"
NODE_UTILS="${NODE_UTILS} pm2 run-anywhere cli-shezargs"

# Add docker
if [ -n $INSTALL_DOCKER ]; then
  pwd
  mkdir -p "${user_docker_conf_dir}"
  chown "${the_user_name}":"${the_user_name}" "${user_docker_conf_dir}"
  chmod ug+rwx  "${user_docker_conf_dir}"

  curl -sSL "https://download.docker.com/linux/ubuntu/gpg" | apt-key add -
  echo "deb https://download.docker.com/linux/ubuntu ${osversion} stable" | tee /etc/apt/sources.list.d/docker.list
  APT_PACKAGES="${APT_PACKAGES} docker-ce"
fi

# Now that we know about nodesource's repos, install node and anything else requested
DEBIAN_FRONTEND=noninteractive apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ${APT_PACKAGES}

DEBIAN_FRONTEND=noninteractive apt-get update

npm install -g ${NODE_UTILS}

# Start docker
if [ -n $INSTALL_DOCKER ]; then
  systemctl enable docker

  # see: https://docs.docker.com/install/linux/linux-postinstall
fi

# If devOps, make things easier
if [ -n $INSTALL_OPS ]; then
  echo "Installing ops"

  apt-get install -y awscli jq libzmq-dev

  if [ -n $INSTALL_DOCKER ]; then
    # no sudo for docker commands
    groupadd docker || true
    usermod -aG docker $the_user_name
  fi
fi

