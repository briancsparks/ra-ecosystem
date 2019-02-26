#!/bin/bash -ex

# Things to install
APT_PACKAGES="ntp tree htop zip unzip"
NODE_UTILS=""

# What utils should be installed?
INSTALL_DOCKER="1"
INSTALL_OPS="1"                   # Make easier to use day-to-day

# quicknetuserdataenvcursor

# Some macros
osversion="$(lsb_release -c | awk '{print $2}')"
the_user_name="ubuntu"
the_home_dir="/home/${the_user_name}"
user_docker_conf_dir="${the_home_dir}/.docker"

env

mkdir -p "${the_home_dir}/.config/"
sudo chown -R "${the_user_name}":"${the_user_name}" "${the_home_dir}/.config/"

# Install apt-over-https
# DEBIAN_FRONTEND=noninteractive apt-get update
# DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common

# ----------------------------------------------------------------------------------------------
# Update pointers to package repos for packages that are mostly kept outside the official repos

# Node.js
curl -sSL "https://deb.nodesource.com/gpgkey/nodesource.gpg.key" | apt-key add -
echo "deb https://deb.nodesource.com/node_8.x ${osversion} main" | tee /etc/apt/sources.list.d/nodesource.list

# Nginx
curl -sSL "https://nginx.org/keys/nginx_signing.key" | apt-key add -
echo "deb https://nginx.org/packages/mainline/ubuntu ${osversion} nginx" | tee -a /etc/apt/sources.list.d/nginx.list
# sudo apt-get update && sudo apt-get install -y nginx nginx-module-njs

# Docker
curl -sSL "https://download.docker.com/linux/ubuntu/gpg" | apt-key add -
echo "deb https://download.docker.com/linux/ubuntu ${osversion} stable" | tee /etc/apt/sources.list.d/docker.list

# MongoDB
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
echo "deb https://repo.mongodb.org/apt/ubuntu ${osversion}/mongodb-org/4.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.0.list
# sudo apt-get update && sudo apt-get install -y mongodb-org

# Lets Encrypt
add-apt-repository -y ppa:certbot/certbot
# sudo apt-get update && sudo apt-get install -y certbot python-certbot-nginx

# ----------------------------------------------------------------------------------------------



# Add nodesource to our sources
APT_PACKAGES="${APT_PACKAGES} nodejs"
NODE_UTILS="${NODE_UTILS} pm2 run-anywhere cli-shezargs quick-net"
echo 'NODE_ENV="production"' | tee -a /etc/environment

# Add docker
if [ -n $INSTALL_DOCKER ]; then
  pwd
  mkdir -p "${user_docker_conf_dir}"
  chown "${the_user_name}":"${the_user_name}" "${user_docker_conf_dir}"
  chmod ug+rwx  "${user_docker_conf_dir}"

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

  apt-get install -y jq python-pip

  # pip install --upgrade pip
  # pip install awscli --upgrade --user
  pip install awscli --upgrade

  if [ -n $INSTALL_DOCKER ]; then
    # no sudo for docker commands
    groupadd docker || true
    usermod -aG docker $the_user_name
  fi
fi

