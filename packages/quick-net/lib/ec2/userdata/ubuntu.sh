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
chown -R "${the_user_name}":"${the_user_name}" "${the_home_dir}/.config/"




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

  apt install -y python-pip
  pip install --upgrade pip
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


# ----------------------------------------------------------------------------------------------
# Install script to compliant-ify instance


cat >> /home/ubuntu/mk-compliant  <<'EOF'
#!/bin/bash -ex

group_name="mario-${AWS_ACCT_TYPE}"

if [[ -n $tenable_io_key ]]; then

  mkdir -p ~/zz_packages && cd $_
  curl -s -O "https://s3.amazonaws.com/mobilewebprint-deploy/buildout/packages/NessusAgent-6.10.7-ubuntu1110_amd64.deb"
  sudo dpkg -i "$(find ./ -maxdepth 1 -type f | egrep 'NessusAgent.*\.deb$')"

  sudo /opt/nessus_agent/sbin/nessuscli agent link --key="$tenable_io_key" --host=cloud.tenable.com --port=443 --groups="$group_name" --name="${HOSTNAME}"
  sleep 3
  sudo service nessusagent start

fi

if [[ -n $cloudstrike_id ]]; then

  if ! which aws; then
    if ! which python-pip; then
      sudo apt install -y python-pip
      sudo -H pip install --upgrade pip
    fi
    sudo -H pip install awscli --upgrade
  fi

  mkdir -p ~/zz_packages && cd $_

  aws s3 cp s3://netlab-${AWS_ACCT_TYPE}/buildout/debs/falcon-sensor_4.16.0-6109_amd64.deb ./
  sudo dpkg -i falcon-sensor_4.16.0-6109_amd64.deb || true
  sudo apt-get -f -y install

  sudo /opt/CrowdStrike/falconctl -s --cid="${cloudstrike_id}"
  sudo systemctl start falcon-sensor

fi

EOF

chmod +x "${the_home_dir}/mk-compliant"
chown -R "${the_user_name}":"${the_user_name}" "${the_home_dir}/mk-compliant"


