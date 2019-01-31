#!/bin/bash -ex

curl -sSL 'https://rpm.nodesource.com/setup_8.x' | bash -

yum install -y nodejs gcc-c++ make

curl -sL https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo
yum install -y yarn

npm install -g pm2
