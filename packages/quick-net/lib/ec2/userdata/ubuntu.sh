#!/bin/bash -ex

NODE_UTILS=""

# What to install?
INSTALL_DOCKER="1"
INSTALL_OPS="1"

# This next line will get replaced with vars that might override the above, and ENV vars that go into /etc/environment
# quicknetuserdataenvcursor



# Some macros
osversion="$(lsb_release -c | awk '{print $2}')"
the_user_name="ubuntu"
the_home_dir="/home/${the_user_name}"
user_docker_conf_dir="${the_home_dir}/.docker"

# Clean up ~/.config
mkdir -p "${the_home_dir}/.config/"
sudo chown -R "${the_user_name}":"${the_user_name}" "${the_home_dir}/.config/"




# ----------------------------------------------------------------------------------------------
# Add node and global npm packages
NODE_UTILS="${NODE_UTILS} pm2 run-anywhere cli-shezargs quick-net"

# ----------------------------------------------------------------------------------------------
# Add docker
if [[ -n $INSTALL_DOCKER ]]; then
  pwd
  mkdir -p "${user_docker_conf_dir}"
  chown "${the_user_name}":"${the_user_name}" "${user_docker_conf_dir}"
  chmod ug+rwx  "${user_docker_conf_dir}"

fi



npm install -g ${NODE_UTILS}


# We like github
ssh-keyscan github.com              >> ~/.ssh/known_hosts
ssh-keyscan github.azc.ext.hp.com   >> ~/.ssh/known_hosts




# ----------------------------------------------------------------------------------------------
# If devOps, make things easier
if [[ -n $INSTALL_OPS ]]; then
  echo "Installing ops"

  pip install awscli --upgrade
fi

# ----------------------------------------------------------------------------------------------
# Start docker
if [[ -n $INSTALL_DOCKER ]]; then
  systemctl enable docker

  # see: https://docs.docker.com/install/linux/linux-postinstall

  # no sudo for docker commands
  groupadd docker || true
  usermod -aG docker $the_user_name
fi

