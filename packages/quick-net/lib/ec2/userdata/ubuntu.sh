#!/bin/bash -ex

## Get instanceId
curl -sSL 'http://169.254.169.254/latest/dynamic/instance-identity/document' > /tmp/quicknetinstdata.json
export INSTANCE_ID="$(cat /tmp/quicknetinstdata.json | jq -r '.instanceId')"
echo "INSTANCE_ID=\"${INSTANCE_ID}\"" >> /etc/environment

export PRIVATE_IP="$(cat /tmp/quicknetinstdata.json | jq -r '.privateIp')"
echo "PRIVATE_IP=\"${PRIVATE_IP}\"" >> /etc/environment

NODE_UTILS=""

# What to install?
## INSTALL_DOCKER="1"
INSTALL_OPS="1"
## INSTALL_AGENTS="0"
## INSTALL_NAT="1"

## This next line will get replaced with vars that might override the above, and ENV vars that go into /etc/environment
# quicknetuserdataenvcursor



# Some macros
osversion="$(lsb_release -c | awk '{print $2}')"
the_user_name="ubuntu"
the_home_dir="/home/${the_user_name}"
user_docker_conf_dir="${the_home_dir}/.docker"

# Clean up ~/.config
mkdir -p "${the_home_dir}/.config/"
chown -R "${the_user_name}":"${the_user_name}" "${the_home_dir}/.config/"




## ----------------------------------------------------------------------------------------------
# Add node and global npm packages
NODE_UTILS="${NODE_UTILS} pm2 run-anywhere cli-shezargs quick-net"

#AAAA INSTALL_DOCKER
## ----------------------------------------------------------------------------------------------
# Add docker
if [[ -n $INSTALL_DOCKER ]]; then
  pwd
  mkdir -p "${user_docker_conf_dir}"
  chown "${the_user_name}":"${the_user_name}" "${user_docker_conf_dir}"
  chmod ug+rwx  "${user_docker_conf_dir}"

fi
#ZZZZ INSTALL_DOCKER



npm install -g ${NODE_UTILS}


# We like github
ssh-keyscan github.com              >> ~/.ssh/known_hosts
ssh-keyscan github.azc.ext.hp.com   >> ~/.ssh/known_hosts



#AAAA INSTALL_OPS
## ----------------------------------------------------------------------------------------------
# If devOps, make things easier
#if [[ -n $INSTALL_OPS ]]; then
#  echo "Installing ops"
#
#  apt install -y python-pip
#  pip install --upgrade pip
#  pip install awscli --upgrade
#fi
#ZZZZ INSTALL_OPS


#AAAA INSTALL_DOCKER
## ----------------------------------------------------------------------------------------------
# Start docker
if [[ -n $INSTALL_DOCKER ]]; then
  systemctl enable docker

  # see: https://docs.docker.com/install/linux/linux-postinstall

  # no sudo for docker commands
  groupadd docker || true
  usermod -aG docker $the_user_name
fi
#ZZZZ INSTALL_DOCKER


#AAAA INSTALL_AGENTS
## ----------------------------------------------------------------------------------------------
# Install script to compliant-ify instance

if [[ -n $INSTALL_AGENTS ]]; then

cat >> /home/ubuntu/mk-compliant  <<'EOF'
#!/bin/bash -ex

group_name="mario-${AWS_ACCT_TYPE}"

if [[ -n $TENABLE_IO_KEY ]]; then

  mkdir -p ~/zz_packages && cd $_
  curl -s -O "https://s3.amazonaws.com/mobilewebprint-deploy/buildout/packages/NessusAgent-6.10.7-ubuntu1110_amd64.deb"
  sudo dpkg -i "$(find ./ -maxdepth 1 -type f | egrep 'NessusAgent.*\.deb$')"

  sudo /opt/nessus_agent/sbin/nessuscli agent link --key="$TENABLE_IO_KEY" --host=cloud.tenable.com --port=443 --groups="$group_name" --name="${HOSTNAME}"
  sleep 3
  sudo service nessusagent start

fi

if [[ -n $CLOUDSTRIKE_ID ]]; then

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

  sudo /opt/CrowdStrike/falconctl -s --cid="${CLOUDSTRIKE_ID}"
  sudo systemctl start falcon-sensor

fi

EOF

  chmod +x "${the_home_dir}/mk-compliant"
  chown -R "${the_user_name}":"${the_user_name}" "${the_home_dir}/mk-compliant"
fi
#ZZZZ INSTALL_AGENTS


#AAAA INSTALL_NAT
## ----------------------------------------------------------------------------------------------
# Install NAT
##  https://www.theguild.nl/cost-saving-with-nat-instances/
##  https://www.nairabytes.net/81-linux/418-how-to-set-up-a-nat-router-on-ubuntu-server-16-04
##  https://askubuntu.com/questions/898473/nat-using-iptables-on-ubuntu-16-04-doesnt-work
if [[ -n $INSTALL_NAT ]]; then
  sysctl -w net.ipv4.ip_forward=1
  sysctl net.ipv4.conf.ens5.forwarding=1

  echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
  echo 'net.ipv6.conf.ens5.forwarding=1' >> /etc/sysctl.conf
  echo 'net.ipv6.conf.all.forwarding=1' >> /etc/sysctl.conf

  /sbin/iptables -A FORWARD -o ens5 -j ACCEPT
  /sbin/iptables -A FORWARD -m state --state ESTABLISHED,RELATED -i ens5 -j ACCEPT
  /sbin/iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE

  iptables-save > /etc/iptables/rules.v4
fi
#ZZZZ INSTALL_NAT

aws s3 cp "s3://quicknet/quick-net/deploy/${INSTANCE_ID}/usr-sbin/qn-bootstrap" /tmp
bash -ex /tmp/qn-bootstrap
