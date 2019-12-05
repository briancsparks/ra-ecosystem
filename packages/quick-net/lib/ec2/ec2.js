if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);


const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-diag'));
const { _ }                   = sg;
const { qm }                  = ra.get3rdPartyLib('quick-merge');
const qnutils                 = require('../../lib/utils');
const fs                      = require('fs');
const os                      = require('os');
const path                    = require('path');
const MimeNode                = require('emailjs-mime-builder').default;
const jsyaml                  = require('js-yaml');
const clipboardy              = require('clipboardy');
const awsDefs                 = require('../aws-defs');
const libAws                  = require('../aws');
const libVpc                  = require('./vpc');
const libTags                 = require('./tags');
const cloudInit               = require('../sh/cloud-init');
const {setARecord}            = require('../route53');
const {putShellScriptToS3}    = require('../s3');
const libNginxConfig          = require('../nginx/config');
const {ipNumber,toIp}         = require('./cidr');
const {mkS3path,
       safePathFqdn,
       addClip}               = qnutils;
var   theCommandToRun         = '';

const mod                     = ra.modSquad(module, 'quickNetEc2');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();

const dg                      = DIAG.dg;

const awsFilters              = libAws.awsFilters;
const awsFilter               = libAws.awsFilter;
const awsKey                  = libAws.awsKey;

const ec2                     = libAws.awsService('EC2');
const iam                     = libAws.awsService('IAM');
const s3                      = libAws.awsService('S3');

const sshix                   = `ssh -A -o "StrictHostKeyChecking no" -o UserKnownHostsFile=/dev/null -o ConnectTimeout=1`;


const MimeBuilder             = MimeNode;

const namespace               = ENV.lc('NAMESPACE') || 'quicknet';
const s3path                  = mkS3path(namespace);

/*

    # Notes for installing cloud-watch agent

    NOTE: these instructions do not include the fact that the agent expects
    answers from the operator at install time.  There is an input file format
    you can use, but it is not here.


    # https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/QuickStartEC2Instance.html
    sudo apt-get update
    curl https://s3.amazonaws.com/aws-cloudwatch/downloads/latest/awslogs-agent-setup.py -O
    sudo python ./awslogs-agent-setup.py --region us-east-1

    #!/bin/bash
    curl https://s3.amazonaws.com/aws-cloudwatch/downloads/latest/awslogs-agent-setup.py -O
    chmod +x ./awslogs-agent-setup.py
    sudo python ./awslogs-agent-setup.py -n -r us-east-1 -c s3://aws-s3-bucket1/my-config-file

    # Output
    #------------------------------------------------------
    #- Configuration file successfully saved at: /var/awslogs/etc/awslogs.conf
    #- You can begin accessing new log events after a few moments at https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logs:
    #- You can use 'sudo service awslogs start|stop|status|restart' to control the daemon.
    #- To see diagnostic information for the CloudWatch Logs Agent, see /var/log/awslogs.log
    #- You can rerun interactive setup using 'sudo python ./awslogs-agent-setup.py --region us-east-1 --only-generate-config'
    #------------------------------------------------------

*/


var subnets = {
  D: {
    admin:        {cidr: '10.13.51.0/24', ip0: '10.13.51.0', typeIp0: '10.13.51.4'},
    db:           {cidr: '10.13.54.0/24', ip0: '10.13.54.0', typeIp0: '10.13.54.8'},
    util:         {cidr: '10.13.57.0/24', ip0: '10.13.57.0', typeIp0: '10.13.57.8'},
    webtier:      {cidr: '10.13.48.0/24', ip0: '10.13.48.0', typeIp0: '10.13.48.10'},
    worker:       {cidr: '10.13.0.0/20',  ip0: '10.13.0.0',  typeIp0: '10.13.0.32'},
    workstation:  {cidr: '10.13.0.0/20',  ip0: '10.13.0.0',  typeIp0: '10.13.0.16'},
  }
};
subnets.d = subnets.D;


// =======================================================================================================
// upsertInstance

DIAG.usage({ aliases: { upsertInstance: { args: {
}}}});

const instanceBaseOpts = `--distro=ubuntu --classB=13 --az=d  --typeNum=2 --debug`;
const instanceOptsTerm = `--distro=ubuntu --classB=13 --az=d  --Terminate --typeNum=2 --debug`;
DIAG.usefulCliArgs({
  db            : [instanceBaseOpts, `--key=quicknetprj_demo --type=t3.micro --PrivateIpAddressX 10.13.54.8  --INSTALL_MONGODB     --INSTALL_CLIENTS --INSTALL_OPS`].join(' '),                  // 10.13.48.0/24
  util          : [instanceBaseOpts, `--key=quicknetprj_demo --type=t3.micro --PrivateIpAddressX 10.13.54.8  --INSTALL_WEBTIER     --INSTALL_CLIENTS --INSTALL_OPS`].join(' '),                  // 10.13.48.0/24
  admin         : [instanceBaseOpts, `--key=HQ               --type=t3.nano  --PrivateIpAddressX 10.13.51.4  --INSTALL_ADMIN       --INSTALL_CLIENTS --INSTALL_USER`].join(' '),                 // 10.13.51.0/24

  webtier       : [instanceOptsTerm, `--key=quicknetprj_demo --type=t3.nano  --PrivateIpAddressX 10.13.48.10 --INSTALL_WEBTIER     --INSTALL_CLIENTS --INSTALL_OPS`].join(' '),                  // 10.13.48.0/24
  worker        : [instanceOptsTerm, `--key=quicknetprj_demo --type=t3.micro --PrivateIpAddressX 10.13.0.16  --INSTALL_WORKER      --INSTALL_CLIENTS`].join(' '),                                 // 10.13.0.0/20
  workstation   : [instanceOptsTerm, `--key=quicknetprj_demo --type=t3.micro --PrivateIpAddressX 10.13.0.32  --INSTALL_WORKSTATION --INSTALL_CLIENTS --INSTALL_OPS`].join(' '),                   // 10.13.0.0/20
  workstationb  : [instanceOptsTerm, `--key=sparksb          --type=t3.micro --PrivateIpAddressX 10.13.0.32  --INSTALL_WORKSTATION --INSTALL_CLIENTS --INSTALL_OPS`].join(' '),                   // 10.13.0.0/20
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--useful=webtier --debug`);
// DIAG.activeName = 'upsertInstance';

/**
 * Upsert an instance.
 */
mod.xport(DIAG.xport({upsertInstance: function(argv_, context, callback) {
  const diag    = DIAG.diagnostic({argv_, context, callback});

  // TODO: Make sg.ENV be run-time changable so NO_REDIS can be turned on and off

  // TODO: Can move setARecord earlier, cuz it has public ip

  /*
    Ubuntu 16.04 as of 1/25/2019
    quick-net upsertInstance --distro=ubuntu --type=t3.micro --key=example --classB=13 --sgs=web --subnet=webtier --az=d --iam=example-webtier-instance-role --INSTALL_WEBTIER --Terminate
    quick-net upsertInstance --image=ami-03a935aafa6b52b97 --distro=ubuntu --type=t3.small --key= --sgs= --subnet=
    quick-net upsertInstance --image=ami-03a935aafa6b52b97 --distro=ubuntu --type=c5.xlarge --key= --sgs= --subnet=

    Amazon Linux 2 with ECS as of 1/25/2019
    ra invoke packages\quick-net\lib\ec2\ec2.js upsertInstance --image=ami-011a85ba0ae2013bf --distro=amazon2ecs --type=t3.small --key= --sgs= --subnet=
  */

  // Provide system-wide services
  // INSTALL_WEBTIER, INSTALL_NAT, INSTALL_MONGODB, INSTALL_DOCKER, INSTALL_KUBERNETES, INSTALL_CLIENTS
  // TODO: INSTALL_WORKSTATION
  // TODO: INSTALL_WORKER
  // TODO: INSTALL_USER
  // TODO: INSTALL_ADMIN
  //
  // Provide add-on functionality
  // INSTALL_AGENTS, INSTALL_MONGO_CLIENTS, INSTALL_REDIS_CLIENTS, INSTALL_AWSCLI_NO
  // TODO: INSTALL_OPS -- vimrc, aliases, etc.

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.quickNetEc2__upsertInstance;

  return rax.iwrap(function(abort, calling) {
    const { runInstances,describeInstances }  = libAws.awsFns(ec2, 'runInstances,describeInstances', rax.opts({}), abort);
    const { modifyInstanceAttribute }         = libAws.awsFns(ec2, 'modifyInstanceAttribute', rax.opts({}), abort);
    const { getSubnets }                      = rax.loads(libVpc, 'getSubnets', rax.opts({}), abort);
    const { getNginxConfigTarball }           = rax.loads(libNginxConfig, 'getNginxConfigTarball', rax.opts({}), abort);
    const { getUbuntuLtsAmis }                = rax.loads('getUbuntuLtsAmis', rax.opts({}), abort);


    var   argv                  = {...argv_};

    // INSALL_ meta packages
    if (argv.INSTALL_WORKSTATION) {
      // TODO: want nginx, do not want certs
      argv.INSTALL_WEBTIER = argv.INSTALL_DOCKER_CHEAT = argv.INSTALL_KUBERNETES = argv.INSTALL_CLIENTS = true;

      // _WEBTIER implies a lot. Indicate that we do not want all the extras
      argv.INSTALL_WEBTIER_EXTRA_NO = true;
    }

    argv.INSTALL_MONGO_CLIENTS  = argv.INSTALL_CLIENTS  || argv.INSTALL_MONGO_CLIENTS   || true;
    argv.INSTALL_REDIS_CLIENTS  = argv.INSTALL_CLIENTS  || argv.INSTALL_REDIS_CLIENTS   || true;
    argv.INSTALL_OPS            = argv.INSTALL_USER     || argv.INSTALL_WORKSTATION     || argv.INSTALL_OPS;
    argv.INSTALL_DOCKER         = argv.INSTALL_WORKER   || argv.INSTALL_DOCKER;

    var   AllAwsParams          = sg.reduce(argv, {}, (m,v,k) => ( sg.kv(m, awsKey(k), v) || m ));

    const uniqueName            = rax.arg(argv, 'uniqueName,unique', {required: sg.modes().production});
    var   ImageId               = rax.arg(argv, 'ImageId,image');
    var   roles                 = rax.arg(argv, 'roles,role', {required: sg.modes().production, keyMirror:true}) ||{};
    var   typeNum               = rax.arg(argv, 'typeNum', {def:2, addToArgv:true});
    const distro                = rax.arg(argv, 'distro', {required:true});
    var   osVersion             = rax.arg(argv, 'osVersion,os-version');
    const InstanceType          = rax.arg(argv, 'InstanceType,instanceType,instance,type', {required:true});
    const classB                = rax.arg(argv, 'class_b,classB,b');
    var   az                    = rax.arg(argv, 'AvailabilityZone,az');
    const KeyName               = rax.arg(argv, 'KeyName,key', {required:true});
    var   SecurityGroupIds      = rax.arg(argv, 'SecurityGroupIds,sgs', { /*required:true,*/ array:true})   || getSgsForInstance(argv);
    var   SubnetId              = rax.arg(argv, 'SubnetId,subnet' /*, {required:true}*/)                    || getSubnetForInstance(argv);
    var   BlockDeviceMappings   = rax.arg(argv, 'BlockDeviceMappings,devices');
    const rootVolumeSize        = rax.arg(argv, 'rootVolumeSize,size', {def:8});
    const count                 = rax.arg(argv, 'count', {def:1});
    var   MaxCount              = rax.arg(argv, 'MaxCount,max') || count;
    var   MinCount              = rax.arg(argv, 'MinCount,min') || count;
    const DryRun                = rax.arg(argv, 'DryRun,dry-run');
    const envJsonFile           = rax.arg(argv, 'envjson');
    var   userdataOpts          = rax.arg(argv, 'userdata_opts,userdataOpts')     || {};   // An object
    const moreShellScript       = rax.arg(argv, 'moreshellscript')                || '';
    const cloudInitData         = rax.arg(argv, 'cloudInit,ci')                   || {};
    const roleKeys              = rax.arg(argv, 'roleKeys');
    const iamName               = rax.arg(argv, 'iamName,iam')                    || `quicknetprj-${getIamTypeForInstance(argv)}-instance-role`;
    var   hostname              = rax.arg(argv, 'hostname')                       || getHostnameForInstance(argv);
    var   fqdns                 = rax.arg(argv, 'fqdns,fqdn', {array:true});
    const PrivateIpAddress      = rax.arg(argv, 'privateIp,ip')                   || getIpForInstance(argv);

    // What can be done with ModifyInstanceAttribute
    const SourceDestCheck                       = !!rax.arg(argv, 'SourceDestCheck');
    const EnaSupport                            = !!rax.arg(argv, 'EnaSupport');
    const DisableApiTermination                 = !!rax.arg(argv, 'DisableApiTermination');
    const EbsOptimized                          = !!rax.arg(argv, 'EbsOptimized');
    const Terminate                             = rax.arg(argv,   'Terminate');
    var   InstanceInitiatedShutdownBehavior     = rax.arg(argv,   'InstanceInitiatedShutdownBehavior') || (Terminate && 'terminate'); // Stop or Terminate

    if (argv.INSTALL_WORKER)           { sg.addKm(roles, 'worker'); }
    if (argv.INSTALL_ADMIN)            { sg.addKm(roles, 'admin'); }
    // if (argv.INSTALL_WORKSTATION)      { sg.addKm(roles, 'workstation'); InstanceInitiatedShutdownBehavior = null; }
    if (argv.INSTALL_WORKSTATION)      { sg.addKm(roles, 'workstation'); }

    if (SubnetId === 'workstation')    { SubnetId = 'worker'; }

    const namespace = process.env.NAMESPACE || process.env.NS || 'quicknet';

    // What opts?
    userdataOpts = sg.reduce(Object.keys(argv), userdataOpts, (m,key) => {
      if (key.startsWith('INSTALL_') && typeof argv[key] === 'boolean') {
        m[key] = argv[key];
      }
      return m;
    });

    if (rax.argErrors())    { return rax.abort(); }

    if (!BlockDeviceMappings) {
      // if (!rootVolumeSize)  {
      //   return rax.abort(`Must provide BlockDeviceMappings or rootVolumeSize.`);
      // }
      if (rootVolumeSize)  {
        BlockDeviceMappings = [{DeviceName: '/dev/sda1', Ebs:{VolumeSize: rootVolumeSize}}];
      }
    }

    clipboardy.writeSync('');

    var   bootShellCommands = [
      '#!/bin/bash -ex',
      '',
      'echo "Running boot-shell-commands..."',
      '',
    ];

    var   InstanceId;
    var   userDataScript, mimeArchive;
    return rax.__run2({result:{}}, callback, [function(my, next, last) {

      // Itempotentcy -- use uniqueName so you can upsertInstance many times, and only launch once
      if (!uniqueName)  { return next(); }

      // They sent in a uniqueName. See if it already exists
      return describeInstances(awsFilters({"tag:qn:uniqueName":[uniqueName]}), rax.opts({}), function(err, data) {

        var   theInstance;
        const count = sg.reduce(data.Reservations || [], 0, function(m0, reservations) {
          return sg.reduce(reservations.Instances || [], m0, function(m, instance) {
            const state = instance.State && instance.State.Name;
            if (state !== 'shutting-down' && state !== 'terminated') {
              theInstance = instance;
              return m+1;
            }
            return m;
          });
        });

        // If we have an instance, return it
        if (count > 0) {
          my.result = {...my.result, Instance: theInstance};
          return callback(null, my);
        }

        // The instance for uniqueName does not exist, continue on, and launch it.
        return next();
      });

    }, function(my, next) {

      // --------------------------------------------
      // We need an AMI.

      // Did the caller pass one in?
      if (ImageId)  { return next(); }

      // We have to go get the AMI ourselves
      return getUbuntuLtsAmis({latest:true}, {}, function(err, data) {
        ImageId     = data.ImageId;
        osVersion   = osVersion || data.osVersion;
        return next();
      });

    }, function(my, next) {

      // We must have `ImageId` by now.
      if (rax.argErrors({ImageId}))                                                   { return rax.abort(); }

      // --------------------------------------------
      // We need the security-groups and subnet.

      // Did the caller pass them in?
      if (SecurityGroupIds[0].startsWith('sg-') || SubnetId.startsWith('subnet-'))    { return next(); }

      // Must find them ourselves

      // Must have `classB` to find sgs and subnet
      if (rax.argErrors({classB}))    { return rax.abort(); }

      // Find them ourselves
      return getSubnets({classB, SecurityGroupIds: SecurityGroupIds, SubnetId}, {}, function(err, data) {
        if (sg.ok(err, data)) {
          SecurityGroupIds  = sg.pluck(data.securityGroups, 'GroupId');
          SubnetId          = (data.subnets.filter(s => s.AvailabilityZone.endsWith(az))[0]   || data.subnets[0] || {}).SubnetId;
        }
        return next();
      });

    }, function(my, next) {

      // We must have `SubnetId` by now.
      if (rax.argErrors({SubnetId}))                                                   { return rax.abort(); }

      // -------------------------------------------------------------------------------------------------------
      // Initialize what we are going to cloud-init-ify
      //
      //  cloudInitData['cloud-config'] will hold several attributes for cloud-init-ing the instance
      //

      // Special keys - like build-deploy keys
      if (roleKeys && roleKeys.length > 0) {
        var write_files = [];

        _.each(roleKeys, key => {
          write_files.push({
            content:      key.key,
            owner:        `${key.user}:${key.user}`,
            path:         `/home/${key.user}/.ssh/${key.role}`,
            permissions:  '0400'
          });
        });

        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {write_files});
      }

      return next();

    }, function(my, next) {

      // Build up the user-data script

      // The env file, and the user-data script file
      var   userdataEnv           = readJsonFile(envJsonFile) || {};
      const shellscriptFilename   = path.join(__dirname, 'userdata', `${distro}.sh`);

      userdataEnv = { ...userdataEnv,
        NAMESPACE     : namespace,
        NAMESPACE_LC  : namespace.toLowerCase()
      };

      // Read the user-data script file
      calling(`fs.readFile ${shellscriptFilename}`);
      return fs.readFile(shellscriptFilename, 'utf8', function(err, userDataScript_) {
        if (!sg.ok(err, userDataScript_))    { return abort(err, `fail reading ${distro}`); }

        // Process the user-data script
        userDataScript  = fixUserDataScript(userDataScript_, {uniqueName, userdataOpts, userdataEnv, moreShellScript});
        return next();
      });

    }, function(my, next) {

      // See other stuff for cloud-init
      //
      // https://cloudinit.readthedocs.io/en/latest/topics/modules.html
      //
      // phone_home:
      // final_message:
      //
      //
      // cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
      //   fqdn: 'xyz.com',
      //   hostname: 'booya-123',
      //   rsyslog: [
      //   ],
      //   scripts: {
      //     "per-boot": [
      //     ],
      //     "per-instance": [
      //     ],
      //     "per-once": [
      //     ],
      //     vendor: [
      //     ],
      //   },
      // });

      // Other stuff to install
      //   Anaconda Linux: https://repo.anaconda.com/archive/Anaconda3-2019.10-Linux-x86_64.sh
      //     See readme

      // Install all the stuff we install for every instance
      cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
        package_update: true,
        package_upgrade: true,
        // packages: ['ntp', 'tree', 'htop', 'zip', 'unzip', 'nodejs', 'yarn', 'jq'],
        packages: ['ntp', 'tree', 'htop', 'zip', 'unzip', 'nodejs', 'jq', 'silversearcher-ag', 'redis-server'],
        hostname,
        apt:      {
          preserve_sources_list: true,
          sources: {
            "nodesource.list": {
              key: nodesource_com_key(),
              source: `deb https://deb.nodesource.com/node_12.x ${osVersion} main`
            },
            // "yarn.list": {
            //   key: yarnpkg_com_key(),
            //   source: `deb https://dl.yarnpkg.com/debian/ stable main`
            // }
          }
        },
        runcmd: [
          `echo NAMESPACE="${namespace}" >> /etc/environment`,
          `echo NAMESPACE_LC="${namespace.toLowerCase()}" >> /etc/environment`
        ],
      });

      if (hostname) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          runcmd: [
            `echo 127.0.0.1 ${hostname} >> /etc/hosts`,
          ],
        });
      }

      // Workstation utils
      if (userdataOpts.INSTALL_WORKSTATION) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['build-essential', 'golang-go'],

          goPpa: {
            source: `ppa:longsleep/golang-backports`
          },
          runcmd: [
            // `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`,

            // Not working
            //`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o rustup; sh rustup -y`,
            `echo "" >> /home/ubuntu/readme.md`,
            `echo "install rust:" >> /home/ubuntu/readme.md`,
            `echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o rustup; sh rustup -y" >> /home/ubuntu/readme.md`,
            "",
            `echo '"INSTALL_WORKSTATION": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'workstation');

        // TODO: See also:
        // https://medium.com/@patdhlk/how-to-install-go-1-9-1-on-ubuntu-16-04-ee64c073cd79   (GO)
        //
        // LLVM C++17 on 16.04
        // https://askubuntu.com/questions/1113974/using-c17-with-clang-on-ubuntu-16-04
        //
        // or:
        //
        // apt-get install clang-format clang-tidy clang-tools clang clangd libc++-dev libc++1 libc++abi-dev libc++abi1 libclang-dev libclang1 liblldb-dev libllvm-ocaml-dev libomp-dev libomp5 lld lldb llvm-dev llvm-runtime llvm python-clang
        //
        // wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key|sudo apt-key add -
        // # Fingerprint: 6084 F3CF 814B 57C1 CF12 EFD5 15CF 4D18 AF4F 7421
        //
        // deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial main
        // deb-src http://apt.llvm.org/xenial/ llvm-toolchain-xenial main
        // # 8
        // deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial-8 main
        // deb-src http://apt.llvm.org/xenial/ llvm-toolchain-xenial-8 main
        // # 9
        // deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial-9 main
        // deb-src http://apt.llvm.org/xenial/ llvm-toolchain-xenial-9 main
      }

      // Install docker?
      if (userdataOpts.INSTALL_DOCKER) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['docker-ce'],
          apt:      {
            preserve_sources_list: true,
            sources: {
              "docker.list": {
                key: docker_com_key(),
                source: `deb https://download.docker.com/linux/ubuntu ${osVersion} stable`
              }
            }
          },
          runcmd: [
            `echo '"INSTALL_DOCKER": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'docker');
      }

      // Install Docker from a download script
      if (userdataOpts.INSTALL_DOCKER_CHEAT) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          runcmd: [
            `curl -fsSL https://get.docker.com -o get-docker.sh; sh get-docker.sh`,
            `usermod -aG docker ubuntu`,
            `echo '"INSTALL_DOCKER": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'docker');
      }

      // Install the web-tier?
      if (userdataOpts.INSTALL_WEBTIER) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['nginx', 'nginx-module-njs'],
          apt:      {
            preserve_sources_list: true,
            sources: {
              "nginx.list": {
                key: nginx_org_key(),
                source: `deb https://nginx.org/packages/mainline/ubuntu ${osVersion} nginx`
              }
            }
          },
          runcmd: [
            `echo '"INSTALL_WEBTIER": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'webtier');
      }

      // Install certbot?
      if (userdataOpts.INSTALL_CERTBOT) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['certbot', 'python-certbot-nginx'],
          apt:      {
            preserve_sources_list: true,
            sources: {
              certbotPpa: {
                source: `ppa:certbot/certbot`
              }
            }
          },
          runcmd: [
            `echo '"INSTALL_CERTBOT": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'certbot');
      }

      // Add mongodb to apt for everyone -- only install (below) if install is requested, but we want to be able to install clients
      cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
        apt:      {
          preserve_sources_list: true,
          sources: {
            "mongodb-org-4.0.list": {
              keyid: '9DA31620334BD75D9DCB49F368818C72E52529D4',
              source: `deb https://repo.mongodb.org/apt/ubuntu ${osVersion}/mongodb-org/4.0 multiverse`
            }
          },
        }
      });

      // Install mongodb?
      if (userdataOpts.INSTALL_MONGODB) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['mongodb-org'],
          runcmd: [
            "sed -i -e 's/127.0.0.1/0.0.0.0/' /etc/mongod.conf",
            "systemctl enable mongod",
            `echo '"INSTALL_MONGODB": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'db', 'mongo', 'nosql');
      }

      if (userdataOpts.INSTALL_MONGO_CLIENTS) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['mongodb-clients'],
          runcmd: [
            `echo '"INSTALL_MONGO_CLIENTS": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });
      }

      if (userdataOpts.INSTALL_REDIS_CLIENTS) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['redis-tools'],
          runcmd: [
            `echo '"INSTALL_REDIS_CLIENTS": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });
      }

      // Install kubectl?

      // Like:
      // $ curl -LO http://storage.googleapis.com/kubernetes-release/release/$(curl -sS http://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
      // $ chmod +x ./kubectl
      // $ sudo mv ./kubectl /usr/local/bin/kubectl
      //

      // If you want kops:
      // $ curl -LO https://github.com/kubernetes/kops/releases/download/$(curl -s https://api.github.com/repos/kubernetes/kops/releases/latest | jq -r '.tag_name')/kops-linux-amd64
      // $ chmod +x kops-linux-amd64
      // $ sudo mv kops-linux-amd64 /usr/local/bin/kops

      if (userdataOpts.INSTALL_KUBERNETES) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['kubectl'],
          apt:      {
            preserve_sources_list: true,
            sources: {
              "kubernetes.list": {
                // key: kubernetes_io_key(),
                keyid: '6A030B21BA07F4FB',
                source: `deb https://apt.kubernetes.io/ kubernetes-${osVersion} main`
              }
            }
          },
          runcmd: [
            `echo '"INSTALL_KUBERNETES": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'k8s');
      }

      // etcd
      // See https://devopscube.com/setup-etcd-cluster-linux/
      //
      // etcd on Docker:
      //   in qn-bootstrap-nonroot

      // Install stuff for NAT instances?
      if (userdataOpts.INSTALL_NAT) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['iptables-persistent'],
          runcmd: [
            `echo '"INSTALL_NAT": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });

        sg.addKm(roles, 'bastion' , 'nat');
      }

      // Install tools for dev-ops?
      if (!userdataOpts.INSTALL_AWSCLI_NO) {
        userdataOpts.INSTALL_PIP = true;

        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          // packages: ['python-pip'],
          runcmd: [
            "pip install --upgrade awscli",
          ],
        });
      }

      // Python-pip
      if (userdataOpts.INSTALL_PIP) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['python-pip'],
          runcmd: [
            `echo '"INSTALL_PIP": true,' >> /home/ubuntu/quicknet-installed`,
          ],
        });
      }

      return next();

    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // Finalize what we are going to cloud-init-ize

      // Reboot, if required
      cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
        power_state: {
          mode:       "reboot",
          message:    "Go on without me, boys... I'm done-fer [[rebooting now]]",
          // condition:  "test -f /var/run/reboot-required"
          condition:  true
        },
        runcmd: [
          "sed -i -e '$aAcceptEnv TENABLE_IO_KEY' /etc/ssh/sshd_config",
          "sed -i -e '$aAcceptEnv CLOUDSTRIKE_ID' /etc/ssh/sshd_config",
        ],
      });

      return next();

    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // Build the mime-archive

      mimeArchive = new MimeBuilder('multipart/mixed');

      if (userDataScript) {
        mimeArchive.appendChild(new MimeBuilder('text/x-shellscript')
          .setContent(userDataScript)
          .setHeader('content-disposition', `attachment; filename=shellscript`)
          .setHeader('content-transfer-encoding', 'quoted-printable')                 /*  MUST use quoted-printable, so the lib does not use 'flowable' */
        );
      }

      // write_files is erroring
      // console.error(`writefiles`, sg.inspect({cloudInitData}));
      delete cloudInitData['cloud-config'].write_files;

      if (cloudInitData['cloud-config']) {
        let yaml = jsyaml.safeDump(cloudInitData['cloud-config'], {lineWidth: 512});

        // addClip([
        //   `Cloud-config size: ${yaml.length}`,
        //   yaml,
        // ]);

        sg.debugLog(`Cloud-config size`, {size: yaml.length});
        if (yaml.length > 16384) {
          ractx.endMessage = ractx.endMessage + `Cloud-config size is too big: ${yaml.length}`;

          return callback('ETOOBIG');
        }

        mimeArchive.appendChild(new MimeBuilder('text/cloud-config')
          .setContent(yaml)
          .setHeader('content-transfer-encoding', 'quoted-printable')                 /*  MUST use quoted-printable, so the lib does not use 'flowable' */
        );
      }

      return next();

    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // runInstances

      var UserData;
      var params = {};

      var instanceName;

      var Tags            = [{Key: 'realm', Value: 'quicknet'}];
      var dependentTags   = [];

      // Tag with `uniqueName`
      if (uniqueName) {
        instanceName              = uniqueName;
        Tags  = [ ...Tags, {Key:'qn:uniqueName', Value:uniqueName}];
      }

      // instanceName = instanceName || hostname;

      // if (roles.length > 0) {
      //   instanceName              = instanceName || roles[0];
      //   Tags  = [ ...Tags, {Key:'qn:roles', Value: `:${roles.join(':')}:`}];
      // }

      const rolesKeys = Object.keys(roles);
      if (rolesKeys.length > 0) {
        instanceName              = instanceName || rolesKeys[0];
        Tags  = [ ...Tags, {Key:'qn:roles', Value: `:${rolesKeys.join(':')}:`}];
      }

      if (hostname || instanceName) {
        dependentTags  = [ ...dependentTags, {Key:'Name', Value:hostname || instanceName}];
      }

      if (Tags.length > 0) {
        params.TagSpecifications  = [{ResourceType:'instance', Tags: [...Tags, ...(dependentTags ||[])]}];
      }

      // Build up the cloud-init userdata
      const userdata = mimeArchive.build();
      sg.elog(`buildmime`, {userdataOpts, userdata, len: userdata.length});

      if (userdata) {
        UserData   = Buffer.from(userdata).toString('base64');
      }

      // Add the instance-role profile name
      if (iamName) {
        params.IamInstanceProfile = {Name: iamName};
      }

      var tries = 0;
      if (PrivateIpAddress) {
        params.PrivateIpAddress = PrivateIpAddress;
      }

      return oneRun();

      function oneRun() {
        // Make the runInstances params, and launch
        params = sg.merge(AllAwsParams, params, {ImageId, InstanceType, KeyName, SecurityGroupIds, SubnetId, MaxCount, MinCount, UserData, BlockDeviceMappings, DryRun});
        return runInstances(params, rax.opts({abort:false}), function(err, data) {
          if (err && err.code === 'InvalidIPAddress.InUse') {
            argv.typeNum += 1;

            hostname = getHostnameForInstance(argv);
            cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
              hostname,
            });
            redoMime();

            params.PrivateIpAddress = getIpForInstance(argv);

            dependentTags  = [{Key:'Name', Value:hostname}];
            params.TagSpecifications  = [{ResourceType:'instance', Tags: [...Tags, ...(dependentTags ||[])]}];

            tries += 1;
            if (tries <= 4) {
              return sg.setTimeout(250, oneRun);
            }

            // Let the system assign one. Better than failing.
            delete params.PrivateIpAddress;
          }

          if (err) {
            return abort(err);
          }

          my.result   = {...my.result, Instance: data.Instances[0]};
          InstanceId  = my.result.Instance.InstanceId;
          return next();
        });
      }

      function redoMime() {
        mimeArchive = new MimeBuilder('multipart/mixed');

        if (userDataScript) {
          mimeArchive.appendChild(new MimeBuilder('text/x-shellscript')
            .setContent(userDataScript)
            .setHeader('content-disposition', `attachment; filename=shellscript`)
            .setHeader('content-transfer-encoding', 'quoted-printable')                 /*  MUST use quoted-printable, so the lib does not use 'flowable' */
          );
        }

        // write_files is erroring
        // console.error(`writefiles`, sg.inspect({cloudInitData}));
        delete cloudInitData['cloud-config'].write_files;

        if (cloudInitData['cloud-config']) {
          let yaml = jsyaml.safeDump(cloudInitData['cloud-config'], {lineWidth: 512});

          // addClip([
          //   `Cloud-config size: ${yaml.length}`,
          //   yaml,
          // ]);

          sg.debugLog(`Cloud-config size`, {size: yaml.length});
          if (yaml.length > 16384) {
            ractx.endMessage = ractx.endMessage + `Cloud-config size is too big: ${yaml.length}`;

            return callback('ETOOBIG');
          }

          mimeArchive.appendChild(new MimeBuilder('text/cloud-config')
            .setContent(yaml)
            .setHeader('content-transfer-encoding', 'quoted-printable')                 /*  MUST use quoted-printable, so the lib does not use 'flowable' */
          );
        }

        // Build up the cloud-init userdata
        const userdata = mimeArchive.build();
        sg.elog(`rebuildmime=================================`, {userdataOpts, userdata, len: userdata.length});

        if (userdata) {
          UserData   = Buffer.from(userdata).toString('base64');
        }

      }

      // function inc(PrivateIpAddress) {
      //   var ip = PrivateIpAddress.split('.');
      //   ip[3] = (+ip[3]) + 1;
      //   return ip.join('.');
      // }
    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // The instance is launching... We can do other things while it starts.

      // -------------------------------------------------------------------------------------------------------
      // Put stuff on S3 for the instance

      const utilFiles     = 'qn-bootstrap,qn-bootstrap-nonroot,qn-bootstrap-other,qn-untar-from-s3,qn-cmd-from-s3,sshix,qn-hosts,qn-redis,qn-mongo,qn-get-certs-from-s3,qn-get-client-certs-from-s3,qn-install-etcd'.split(',');
      const homeFiles     = '.vimrc,.profile,.bashrc,.bash_aliases'.split(',');
      const s3deployPath  = s3path('deploy', InstanceId);

      return sg.__run2(next, [function(next) {
        return sg.__eachll(utilFiles, function(filename, next) {
          return copyFileToS3(path.join(__dirname, 'instance-help', 'usr-sbin', filename), `${s3deployPath}/usr-sbin`, function(err, data) {
            sg.debugLog(`Uploaded ${filename} script`, {err, data});
            return next();
          });
        }, next);

      }, function(next) {
        return sg.__eachll(homeFiles, function(filename, next) {
          return copyFileToS3(path.join(__dirname, 'instance-help', 'home', filename), `${s3deployPath}/home`, function(err, data) {
            sg.debugLog(`Uploaded ${filename}`, {err, data});
            return next();
          });
        }, next);

      }, function(next) {
        if (!userdataOpts.INSTALL_WEBTIER)                { return next(); }
        if (userdataOpts.INSTALL_WEBTIER_EXTRA_NO)        { return next(); }

        const {PrivateIpAddress} = my.result.Instance;

        // --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001
        const ngArgs = {
          // fqdns,
          reloadServer        : false,
          type                : 'qnwebtier',
          rpxiPort            : 3009,
          fqdns               : fqdns || 'api.cdr0.net'.split(','),
          // sidecar             : '/clientstart,3009',
          // upstream            : 'clients',
          // upstream_service    : '10.1.2.3:3001',
          // location            : '/clientstart',
        };
        const fqdn                = (ngArgs.fqdns ||[])[0];
        const fqdnPath            = safePathFqdn(fqdn);
        my.result.fqdns           = [...(my.result.fqdns || []), fqdn];

        return getNginxConfigTarball({distro, ...ngArgs}, {}, function(err0, data) {
          const {pack, cwd}         = data;
          const s3packPath          = _.compact([s3deployPath, 'files', ...(cwd.split('/'))]).join('/');
          const s3NginxConfTar      = `${s3packPath}/nginx-conf.tar`;
          const {Bucket,Key}        = parseS3Path(s3NginxConfTar);

          return streamToS3(pack, {Bucket, Key, ContentType: 'application/x-tar'}, function(err, data) {
            sg.debugLog(`Upload nginx config tarball`, {err0, cwd, s3packPath, err, data});

            bootShellCommands = [...bootShellCommands,
              `qn-get-certs-from-s3 s3://quicknet/quick-net/secrets/certs/${fqdnPath}.tar`,
              `sudo chmod -R a+rx /etc/nginx/certs/${fqdnPath}/`,
              `qn-get-client-certs-from-s3 s3://quicknet/quick-net/secrets/certs-client/${fqdnPath}-root-client-ca.crt`,
              `qn-untar-from-s3 ${s3NginxConfTar}`,
            ];

            return next();
          });
        });

      }, function(next) {
        if (!userdataOpts.INSTALL_WEBTIER)                { return next(); }
        if (userdataOpts.INSTALL_WEBTIER_EXTRA_NO)        { return next(); }

        const {PrivateIpAddress} = my.result.Instance;

        // --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001
        const ngArgs = {
          reloadServer        : false,
          skipSystem          : true,
          type                : 'qnwebtier',
          rpxiPort            : 3008,
          fqdns               : 'api.coder-zero.net'.split(','),
        };
        const fqdn                = (ngArgs.fqdns ||[])[0];
        const fqdnPath            = safePathFqdn(fqdn);
        my.result.fqdns           = [...(my.result.fqdns || []), fqdn];

        return getNginxConfigTarball({distro, ...ngArgs}, {}, function(err0, data) {
          const {pack, cwd}         = data;
          const s3packPath          = _.compact([s3deployPath, 'files', ...(cwd.split('/'))]).join('/');
          const s3NginxConfTar      = `${s3packPath}/${fqdnPath}.tar`;
          const {Bucket,Key}        = parseS3Path(s3NginxConfTar);

          return streamToS3(pack, {Bucket, Key, ContentType: 'application/x-tar'}, function(err, data) {
            sg.debugLog(`Upload nginx config tarball`, {err0, cwd, s3packPath, err, data});

            bootShellCommands = [...bootShellCommands,
              `qn-get-certs-from-s3 s3://quicknet/quick-net/secrets/certs/${fqdnPath}.tar`,
              `sudo chmod -R a+rx /etc/nginx/certs/${fqdnPath}/`,
              `qn-get-client-certs-from-s3 s3://quicknet/quick-net/secrets/certs-client/${fqdnPath}-root-client-ca.crt`,
              `qn-untar-from-s3 ${s3NginxConfTar}`,
            ];

            return next();
          });
        });

      }]);

    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // Pre qn-bootstrap-nonroot script

      const {PrivateIpAddress} = my.result.Instance;

      theCommandToRun = `qn-bootstrap-other ${PrivateIpAddress}`;
      addClip([
        `#for ((;;)); do ${sshix} ${PrivateIpAddress} 'whoami'; export SUCCESS="$?"; echo "$SUCCESS"; if [[ $SUCCESS == 0 ]]; then break; fi; sleep 0.4; done`,
        `#${sshix} ${PrivateIpAddress} 'tail -F /var/log/cloud-init-output.log'`,
        theCommandToRun,
      ]);

      bootShellCommands = [...bootShellCommands,
        'qn-hosts redis   10.13.54.167',
        'qn-hosts db      10.13.54.167',
        'qn-hosts mongo   10.13.54.167',
        '',
        'echo "boot-shell-commands done"',
        ''
      ].join('\n');

      const s3filepath  = _.compact([s3path('deploy', InstanceId), 'boot-shell-commands']).join('/');
      return putShellScriptToS3(bootShellCommands, {s3filepath}, function(err, data) {
        sg.debugLog(`Uploaded script ${s3filepath} script`, {err, data});
        return next();
      });

    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------------------
      // The only things we still have left to do require the instance to be started.
      // Must wait for launch

      return sg.until(function(again, last, count, elapsed) {
        return describeInstances({InstanceIds:[InstanceId]}, rax.opts({abort:false}), function(err, data) {
          if (err) {
            if (err.code === 'InvalidInstanceID.NotFound')    { return again(2000); }
            return abort(err);
          }

          // Wait for launch
          const Instance = data.Reservations[0].Instances[0];
          if (Instance.State.Name !== 'running') {
            return again(1000);
          }

          my.result = {...my.result, Instance};
          return last();
        });
      }, next);

    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // Modify instance attributes

      if (SourceDestCheck)    { return next(); }

      // Change SourceDestCheck for NAT instances
      return modifyInstanceAttribute({InstanceId, SourceDestCheck: {Value: SourceDestCheck}}, rax.opts({}), (err, data) => {
        return next();
      });

    }, function(my, next) {
      if (DisableApiTermination)    { return next(); }
      return modifyInstanceAttribute({InstanceId, DisableApiTermination: {Value: DisableApiTermination}}, rax.opts({}), next);

    }, function(my, next) {
      if (!EbsOptimized)    { return next(); }
      return modifyInstanceAttribute({InstanceId, EbsOptimized: {Value: EbsOptimized}}, rax.opts({}), next);

    }, function(my, next) {
      if (!InstanceInitiatedShutdownBehavior)    { return next(); }
      return modifyInstanceAttribute({InstanceId, InstanceInitiatedShutdownBehavior: {Value: InstanceInitiatedShutdownBehavior}}, rax.opts({}), next);

    }, function(my, next) {

      // -------------------------------------------------------------------------------------------------------
      // Set the A record
console.log(`launch`, [my.result.fqdns]);
      if (!my.result.fqdns)    { return next(); }

      const {PublicIpAddress}       = my.result.Instance;

      sg.__eachll(my.result.fqdns, function(fqdn, next) {
        var   [subdomain, ...domain]  = fqdn.split('.');
        domain = domain.join('.');

        const params = {subdomain, domain, ip: PublicIpAddress, fireAndForget: true};
        console.log(`setarecord`, params);
        // return setARecord(params, {}, function(err, data) {
        //   sg.debugLog(`set A record ${subdomain}.${domain} (${PublicIpAddress})`, {params, err, data});
          return next();
        // });
      }, next);

    }, function(my, next) {
      const agent                   = require('./agent/control');

      const {PrivateIpAddress} = my.result.Instance;

      var   bastionIp         = 'bastion.cdr0.net';
      var   targetPrivateIp   = PrivateIpAddress;

      // `qn-bootstrap-other ${PrivateIpAddress}`,
      var   theCommand = theCommandToRun;

      sg.debugLog(`Complete the bootstrap `, {bastionIp, targetPrivateIp, theCommand});
      return agent.spawnit({bastionIp, targetPrivateIp, theCommand}, {}, function(err, data) {

        return next();
      });
    }, function(my, next) {

      sg.debugLog(`Commands: ${clipboardy.readSync()}`);
      return next();
    }]);
  });
}}));



// =======================================================================================================
// upstartInstances

DIAG.usage({ aliases: { upstartInstances: { args: {
}}}});

const clis =
DIAG.usefulCliArgs({
  webtier : [`--distro=ubuntu --classB=13 --key=quicknetprj_demo`,
             `--type=t3.micro --az=d      --INSTALL_WEBTIER --INSTALL_CLIENTS --INSTALL_OPS  --Terminate`].join(' '),
  webtierX : [`--distro=ubuntu --classB=13 --iam=quicknetprj-webtier-instance-role --sgs=web  --subnet=webtier --key=quicknetprj_demo`,
             `--type=t3.micro --az=d      --INSTALL_WEBTIER --INSTALL_CLIENTS --INSTALL_OPS  --Terminate`].join(' '),
  admin   : [`--distro=ubuntu --classB=13 --key=HQ`,
             `--type=t3.nano  --az=d      --INSTALL_ADMIN   --INSTALL_CLIENTS --INSTALL_USER --Terminate`].join(' '),
  adminX  : [`--distro=ubuntu --classB=13 --iam=quicknetprj-admin-instance-role  --sgs=admin --subnet=admin   --key=HQ`,
            `--type=t3.nano  --az=d      --INSTALL_ADMIN   --INSTALL_CLIENTS --INSTALL_USER --Terminate`].join(' '),
  worker  : [`--distro=ubuntu --classB=13 --iam=quicknetprj-worker-instance-role  --sgs=worker --subnet=worker   --key=quicknetprj_demo`,
             `--type=t3.micro --az=d      --INSTALL_WORKER   --INSTALL_CLIENTS --Terminate`].join(' '),
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(clis.admin);
// DIAG.activeName = 'upstartInstances';

/**
 * Upsert an instance.
 */
mod.xport(DIAG.xport({upstartInstances: function(argv_, context, callback) {
  const diag    = DIAG.diagnostic({argv_, context, callback});

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.quickNetEc2__upstartInstances;

  return rax.iwrap(function(abort, calling) {
    const { startInstances,describeInstances }  = libAws.awsFns(ec2, 'startInstances,describeInstances', rax.opts({}), abort);

    // return rax.__run2({result:{}}, callback, [function(my, next, last) {

      // They sent in a uniqueName. See if it already exists
      return describeInstances({}, rax.opts({}), function(err, data) {

        var   theInstances = {};
        var   toBeStarted  = [];

        const count = sg.reduce(data.Reservations || [], 0, function(m0, reservations) {
          return sg.reduce(reservations.Instances || [], m0, function(m, instance) {
            const state       = instance.State && instance.State.Name;
            const InstanceId  = instance.InstanceId;
            const tags        = sg.reduceObj(instance.Tags, {}, function(m, value) {
              return sg.kv(m, value.Key, value.Value);
            });

            (theInstances[state] = theInstances[state] ||{})[InstanceId] = instance;

            if (state === 'stopped' && tags.realm === 'quicknet') {
              toBeStarted.push(InstanceId);
              return m+1;
            }
            return m;
          });
        });

        theInstances = libTags.deTag(theInstances && theInstances.stopped);
        if (toBeStarted.length === 0) { return callback(null); }

        let instances, InstanceIds = {InstanceIds: toBeStarted};

        return startInstances(InstanceIds, function(err, data) {
          diag.d(`startupInstances`, {toBeStarted, err, data});
          if (err)  { return callback(err); }

          // Wait for to start
          return sg.until(function(again, last, count, elapsed) {
            return describeInstances({}, rax.opts({abort:false}), function(err, data) {
              if (err) {
                if (err.code === 'InvalidInstanceID.NotFound')    { return again(2000); }
                return callback(err);
              }

              // Wait for launch
              instances = flaten(data);
              for (var i = 0; i < instances.length; ++i) {
                if (instances[i].State.Name !== 'running') { return again(1000); }
              }

              return last();
            });
          }, function() {
            return callback(null, instances);
          });
        });

      });
    // }]);
  });
}}));

//-----------------------------------------------------------------------------------------------------------------------------
function flaten(reserv) {
  var result = [];

  const eResult = enumInstances(reserv, function(instance) {
    result.push(instance);
  });

  return result;
}

//-----------------------------------------------------------------------------------------------------------------------------
function enumInstances(data, callback) {
  return sg.reduce(data.Reservations || [], {}, function(m0, reservations) {
    return sg.reduce(reservations.Instances || [], m0, function(m, instance) {
      callback(instance);

      const state       = instance.State && instance.State.Name;
      const InstanceId  = instance.InstanceId;
      const tags        = sg.reduceObj(instance.Tags, {}, function(m, value) {
        return sg.kv(m, value.Key, value.Value);
      });

      m.state = m.state || {};
      m.realm = m.realm || {};

      m.state[state]        = m.state[state]      ||[];
      m.realm[tags.realm]   = m.realm[tags.realm] ||[];

      m.state[state].push(instance);
      m.realm[tags.realm].push(instance);

      return m;
    });
  });
}



function getSubnetForInstance(...args) {
  return getTypeForInstance(...args);
}

function getSgsForInstance(argv) {

  // These are instance types, they come first
  if (argv.INSTALL_ADMIN)          { return ['admin']; }
  else if (argv.INSTALL_MONGODB)        { return ['db']; }
  else if (argv.INSTALL_WORKSTATION)    { return ['worker']; }

  // These are features, they come second
  else if (argv.INSTALL_WEBTIER)        { return ['web']; }
  else if (argv.INSTALL_NAT)            { return ['access']; }
  else if (argv.INSTALL_WORKER)         { return ['worker']; }

  sg.logError(`ENOSGTYPE`, `Cannot determine instance security groups`, {argv});
}

function getIamTypeForInstance(...args) {
  return getTypeForInstance(...args);
}

function getTypeForInstance(argv) {

  // These are instance types, they come first
  if (argv.INSTALL_ADMIN)          { return 'admin'; }
  else if (argv.INSTALL_MONGODB)        { return 'db'; }
  else if (argv.INSTALL_WORKSTATION)    { return 'worker'; }

  // These are features, they come second
  else if (argv.INSTALL_WEBTIER)        { return 'webtier'; }
  else if (argv.INSTALL_NAT)            { return 'access'; }
  else if (argv.INSTALL_WORKER)         { return 'worker'; }

  sg.logError(`ENOTYPE`, `Cannot determine instance type`, {argv});
}

function getXTypeForInstance(argv) {

  // These are instance types, they come first
  if (argv.INSTALL_ADMIN)          { return 'admin'; }
  else if (argv.INSTALL_MONGODB)        { return 'db'; }
  else if (argv.INSTALL_WORKSTATION)    { return 'workstation'; }

  // These are features, they come second
  else if (argv.INSTALL_WEBTIER)        { return 'webtier'; }
  else if (argv.INSTALL_NAT)            { return 'access'; }
  else if (argv.INSTALL_WORKER)         { return 'worker'; }

  sg.logError(`ENOTYPE`, `Cannot determine instance type`, {argv});
}

function getHostnameForInstance(argv) {

  const num = argv.typeNum || process.env.INSTANCE_NUMBER || 0;

  // These are instance types, they come first
  if (argv.INSTALL_ADMIN)               { return `admin${num}`; }
  else if (argv.INSTALL_MONGODB)        { return `db${num}`; }
  else if (argv.INSTALL_WORKSTATION)    { return `workstation${num}`; }

  // These are features, they come second
  else if (argv.INSTALL_WEBTIER)        { return `web${num}`; }
  else if (argv.INSTALL_NAT)            { return `access${num}`; }
  else if (argv.INSTALL_WORKER)         { return `worker${num}`; }

  sg.logError(`ENOSGTYPE`, `Cannot determine instance security groups`, {argv});
}

function getIpForInstance(argv) {

  const num = argv.typeNum || process.env.INSTANCE_NUMBER || 0;
  const az  = argv.az      || 'd';

  const type    = getXTypeForInstance(argv);
  const baseIp  = subnets[az][type || `worker`].typeIp0;

  return toIp(ipNumber(baseIp) + (+num));
}



/*
 * TODO:
 *   - Move the below to lib/s3/...
 *   - Make it so the DIAG object has logging functions, so you do not have to always have a Diagnostic object instantiated for every fn
 *   - Make it so the _sg-bits.json files can be read loadSync, but slower.
 *     - For a given module, only one sg-bits object should be built, so any time _sg-bits.json is read, the loadSync fn would have it cached.
 *
 *   - nginx/config.js - add a saveNginxConfigTarballToS3
 *
 *   - Overall, add to ra/platform/{entrypoint,host}/x.js the ability to `ra invoke ...` for the 'rewrite' module
 */

// ----------------------------------------------------------------------------------------------------
var uniq = 0;
function streamThroughFileToS3(readStream, argv, callback) {
  const pathname = path.join(os.tmpdir(), `stream-through-file-to-s3-${uniq++}`);

  const out = fs.createWriteStream(pathname);
  readStream.pipe(out);
  out.on('close', function() {
    return _copyFileToS3_(pathname, argv, callback);
  });
}

// ----------------------------------------------------------------------------------------------------
function copyFileToS3(pathname, s3path, callback) {
  const filename = _.last(pathname.split(/[\\/]/));
  const {Bucket,Key} = parseS3Path(`${s3path}/${filename}`);

  if (!Bucket)    { sg.logError(`NoBucket`, `sending uplaod`, {Bucket,Key,pathname,s3path}); return callback(`NoBucket`); }
  if (!Key)       { sg.logError(`NoKey`,    `sending uplaod`, {Bucket,Key,pathname,s3path}); return callback(`NoKey`); }

  return _copyFileToS3_(pathname, {Bucket, Key}, function(err, data) {
    return callback(err, data);
  });
}

// ----------------------------------------------------------------------------------------------------
function _copyFileToS3_(pathname, argv, callback) {
  const Body = fs.createReadStream(pathname);

  return streamToS3(Body, argv, callback);
}

// ----------------------------------------------------------------------------------------------------
function streamToS3(Body, {Bucket, Key, ContentType ='text/plain'}, callback) {

  if (!Bucket)    { sg.logError(`NoBucket`, `sending uplaod`, {Bucket,Key}); return callback(`NoBucket`); }
  if (!Key)       { sg.logError(`NoKey`,    `sending uplaod`, {Bucket,Key}); return callback(`NoKey`); }
  if (!Body)      { sg.logError(`NoBody`,   `sending uplaod`, {Bucket,Key}); return callback(`NoBody`); }

  var upload = s3.upload({Bucket, Key, Body, ContentType}, {partSize: 6 * 1024 * 1024});

  upload.on('httpUploadProgress', (progress) => {
    sg.debugLog(`uploading file`, {progress});
  });

  upload.send(function(err, data) {
    if (!sg.ok(err, data))  { sg.logError(err, `sending upload`, {Bucket, Key}); return callback(err, data); }

    return callback(err, data);
  });
}

// ----------------------------------------------------------------------------------------------------
function parseS3Path(s3path) {
  const m = s3path.match(/s3:[/][/]([^/]+)[/](.*)/);
  if (!m) { return; }

  const Bucket = m[1];
  const Key = m[2];

  return {Bucket,Key};
}

  // ----------------------------------------------------------------------------------------------------
function readJsonFile(filename_) {
  if (!filename_) {
    return; /* undefined */
  }

  const filename = path.join(process.cwd(), filename_);
  if (!fs.existsSync(filename)) { return; }

  return require(filename);
}

// ----------------------------------------------------------------------------------------------------
function fixUserDataScript(shellscript_, options_) {
  const options = options_ || {};

  const uniqueName        = options.uniqueName;
  const userdataOpts      = options.userdataOpts        || {};
  const userdataEnv       = options.userdataEnv         || {};
  const moreShellScript   = options.moreShellScript;

  // The script starts as the read-in script, plus whatever the caller added
  var shellscript         = shellscript_ + moreShellScript;

  // Signal that the script is done running
  shellscript            += `\n`;
  shellscript            += `echo UserData script is done for ${uniqueName || 'instance'}`;
  shellscript            += `\n`;


  // Process each line in the file
  var skipping;
  shellscript = sg.reduce(shellscript.split('\n'), [], (m, line) => {
    var installStr;

    // Anything starting with `##` is removed
    if (line.match(/^##/)) {
      return m;
    }

    // #AAAA INSTALL_XYZ - starts a section to possibly skip
    if ((installStr = line.match(/^#AAAA (INSTALL_.+)$/))) {
      if (installStr[1] && (installStr[1] in userdataOpts) && !userdataOpts[installStr[1]]) {
        skipping = installStr[1];
      }
      return m;
    }

    // #ZZZZ INSTALL_XYZ - ends the skip section
    if (skipping && (installStr = line.match(/^#ZZZZ (INSTALL_.+)$/))) {
      if (installStr[1] === skipping) {
        skipping = null;
      }
      return m;
    }

    // Skip all between AAAA INSTALL_XYZ and ZZZZ INSTALL_XYZ
    if (skipping) {
      return m;
    }

    // Replace `# quicknetuserdataenvcursor` in the script with the script options (like `INSTALL_DOCKER`), and the env
    if (line.match(/quicknetuserdataenvcursor/i)) {
      // Script options
      var newlines = sg.reduce(_.isObject(userdataOpts) ? userdataOpts : {}, [], (m, v, k) => {

        // For example, `set INSTALL_DOCKER="1"`  or `unset INSTALL_DOCKER`
        if (k.toUpperCase().startsWith('INSTALL_') && !k.toUpperCase().endsWith('_NO')) {
          userdataEnv[k] = "1";
        }

        var   newline = `${k}="${v === true ? '1' : v}"`;
        if (v === false) {
          newline = `unset ${k}`;
        }

        return [...m, newline];
      });

      // env vars
      newlines = sg.reduce(userdataEnv, newlines, (m, v, k) => {
        const newline  = `echo '${k}="${v === true ? '1' : v === false ? '0' : v}"' >> /etc/environment`;
        const newline2 = `export ${k}="${v}"`;

        return [...m, newline, newline2];
      });
      newlines.push(line);

      return [ ...m, ...newlines ];
    }

    return [...m, line];
  }).join('\n');

  return shellscript;
}

/**
 * Gets a list of AMIs.
 *
 * @see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami.html
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
mod.xport({getAmis: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\ec2.js getAmis  --owners=self

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.quickNetEc2__getAmis;

  return rax.iwrap(function(abort) {
    const { describeImages } = libAws.awsFns(ec2, 'describeImages', rax.opts({}), abort);

    const Owners            = rax.arg(argv, 'Owners,owners', {array:true});
    const ExecutableUsers   = rax.arg(argv, 'ExecutableUsers,users', {array:true});
    const Filters           = rax.arg(argv, 'Filters');
    const osVersion         = rax.arg(argv, 'osVersion,os-version');
    const ImageIds          = rax.arg(argv, 'ImageIds,images', {array:true});
    const latest            = rax.arg(argv, 'latest');

    const params = sg.smartExtend({Owners, ExecutableUsers, Filters, ImageIds});
    return describeImages(params, rax.opts({}), function(err, data, ...rest) {
      var   result = data;

      if (latest) {
        result = _.last(_.sortBy(data.Images || [], 'CreationDate'));
      }

      return callback(err, qm(result, {osVersion}), ...rest);
    });
  });
}});

/**
 * Returns a list of Amazon Linux AMIs.
 */
mod.xport({getAmazonLinuxAmis: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\ec2.js getAmazonLinuxAmis --v2 --latest

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.quickNetEc2__getAmazonLinuxAmis;

  return rax.iwrap(function(abort, calling) {
    const { getAmis } = rax.loads('getAmis', rax.opts({}), abort);

    const ecs               = rax.arg(argv, 'ecs');
    const v2                = rax.arg(argv, 'v2');
    const name              = (v2 ?
                                  (ecs ? 'amzn2-ami-ecs-hvm-2.0.20190127-x86_64-ebs'
                                       : 'amzn2-ami-hvm-2.0.????????-x86_64-gp2')
                                  : 'amzn-ami-hvm-????.??.?.????????-x86_64-gp2');
    const Owners            = 'amazon';
    const filters           = awsFilters({name:[name],state:['available']});
    const latest            = rax.arg(argv, 'latest');

    return getAmis(rax.opts({Owners, ...filters, latest}), rax.opts({}), function(err, data) {
      return callback(err, data);
    });
  });
}});

/**
 * Returns a list of Ubuntu LTS AMIs.
 */
mod.xport({getUbuntuLtsAmis: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\ec2.js getUbuntuLtsAmis --latest

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.quickNetEc2__getUbuntuLtsAmis;

  return rax.iwrap(function(abort, calling) {
    const { getAmis } = rax.loads('getAmis', rax.opts({}), abort);

    const osVersion         = rax.arg(argv, 'osVersion,os-version')   || 'xenial';
    const Owners            = ['099720109477'];
    const filters           = awsFilters({name:[`ubuntu/images/hvm-ssd/ubuntu-${osVersion}-16.04-amd64-server-????????`],state:['available']});
    const latest            = rax.arg(argv, 'latest');

    return getAmis(rax.opts({Owners, ...filters, osVersion, latest}), rax.opts({}), callback);
  });
}});

/**
 * Returns a list of Ubuntu LTS AMIs.
 */
mod.xport({getUbuntu18_04Amis: function(argv, context, callback) {

  // ra invoke packages\quick-net\lib\ec2\ec2.js getUbuntu18_04Amis --latest

  const osVersion         = 'bionic';
  const Owners            = ['099720109477'];
  const filters           = awsFilters({name:[`ubuntu/images/hvm-ssd/ubuntu-${osVersion}-18.04-amd64-server-????????`],state:['available']});
  const latest            = argv.latest;

  return module.exports.getAmis({Owners, ...filters, osVersion, latest}, context, callback);
}});



// -----------------------------------------------------------------
// Keys

// curl -sSL "https://deb.nodesource.com/gpgkey/nodesource.gpg.key"
function nodesource_com_key() {
  return `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v1
Comment: GPGTools - https://gpgtools.org

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
=CLGF
-----END PGP PUBLIC KEY BLOCK-----`;
}

// curl -sSL 'https://dl.yarnpkg.com/debian/pubkey.gpg'
function yarnpkg_com_key() {
  return `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v1

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
=oMDY
-----END PGP PUBLIC KEY BLOCK-----`;
}

// curl -sSL "https://nginx.org/keys/nginx_signing.key"
function nginx_org_key() {
  return `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v2.0.22 (GNU/Linux)

mQENBE5OMmIBCAD+FPYKGriGGf7NqwKfWC83cBV01gabgVWQmZbMcFzeW+hMsgxH
W6iimD0RsfZ9oEbfJCPG0CRSZ7ppq5pKamYs2+EJ8Q2ysOFHHwpGrA2C8zyNAs4I
QxnZZIbETgcSwFtDun0XiqPwPZgyuXVm9PAbLZRbfBzm8wR/3SWygqZBBLdQk5TE
fDR+Eny/M1RVR4xClECONF9UBB2ejFdI1LD45APbP2hsN/piFByU1t7yK2gpFyRt
97WzGHn9MV5/TL7AmRPM4pcr3JacmtCnxXeCZ8nLqedoSuHFuhwyDnlAbu8I16O5
XRrfzhrHRJFM1JnIiGmzZi6zBvH0ItfyX6ttABEBAAG0KW5naW54IHNpZ25pbmcg
a2V5IDxzaWduaW5nLWtleUBuZ2lueC5jb20+iQE+BBMBAgAoAhsDBgsJCAcDAgYV
CAIJCgsEFgIDAQIeAQIXgAUCV2K1+AUJGB4fQQAKCRCr9b2Ce9m/YloaB/9XGrol
kocm7l/tsVjaBQCteXKuwsm4XhCuAQ6YAwA1L1UheGOG/aa2xJvrXE8X32tgcTjr
KoYoXWcdxaFjlXGTt6jV85qRguUzvMOxxSEM2Dn115etN9piPl0Zz+4rkx8+2vJG
F+eMlruPXg/zd88NvyLq5gGHEsFRBMVufYmHtNfcp4okC1klWiRIRSdp4QY1wdrN
1O+/oCTl8Bzy6hcHjLIq3aoumcLxMjtBoclc/5OTioLDwSDfVx7rWyfRhcBzVbwD
oe/PD08AoAA6fxXvWjSxy+dGhEaXoTHjkCbz/l6NxrK3JFyauDgU4K4MytsZ1HDi
MgMW8hZXxszoICTTiQEcBBABAgAGBQJOTkelAAoJEKZP1bF62zmo79oH/1XDb29S
YtWp+MTJTPFEwlWRiyRuDXy3wBd/BpwBRIWfWzMs1gnCjNjk0EVBVGa2grvy9Jtx
JKMd6l/PWXVucSt+U/+GO8rBkw14SdhqxaS2l14v6gyMeUrSbY3XfToGfwHC4sa/
Thn8X4jFaQ2XN5dAIzJGU1s5JA0tjEzUwCnmrKmyMlXZaoQVrmORGjCuH0I0aAFk
RS0UtnB9HPpxhGVbs24xXZQnZDNbUQeulFxS4uP3OLDBAeCHl+v4t/uotIad8v6J
SO93vc1evIje6lguE81HHmJn9noxPItvOvSMb2yPsE8mH4cJHRTFNSEhPW6ghmlf
Wa9ZwiVX5igxcvaIRgQQEQIABgUCTk5b0gAKCRDs8OkLLBcgg1G+AKCnacLb/+W6
cflirUIExgZdUJqoogCeNPVwXiHEIVqithAM1pdY/gcaQZmIRgQQEQIABgUCTk5f
YQAKCRCpN2E5pSTFPnNWAJ9gUozyiS+9jf2rJvqmJSeWuCgVRwCcCUFhXRCpQO2Y
Va3l3WuB+rgKjsQ=
=EWWI
-----END PGP PUBLIC KEY BLOCK-----`;
}

// curl -sSL "https://download.docker.com/linux/ubuntu/gpg"
function docker_com_key() {
  return `
-----BEGIN PGP PUBLIC KEY BLOCK-----

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
YT90qFF93M3v01BbxP+EIY2/9tiIPbrd
=0YYh
-----END PGP PUBLIC KEY BLOCK-----`;
}

// curl -sSL "https://packages.cloud.google.com/apt/doc/apt-key.gpg"
function kubernetes_io_key() {

  // Have not tried this key

  return `
-----BEGIN PGP ARMORED FILE-----
Version: GnuPG v1
Comment: Use "gpg --dearmor" for unpacking

mQENBFUd6rIBCAD6mhKRHDn3UrCeLDp7U5IE7AhhrOCPpqGF7mfTemZYHf/5Jdjx
cOxoSFlK7zwmFr3lVqJ+tJ9L1wd1K6P7RrtaNwCiZyeNPf/Y86AJ5NJwBe0VD0xH
TXzPNTqRSByVYtdN94NoltXUYFAAPZYQls0x0nUD1hLMlOlC2HdTPrD1PMCnYq/N
uL/Vk8sWrcUt4DIS+0RDQ8tKKe5PSV0+PnmaJvdF5CKawhh0qGTklS2MXTyKFoqj
XgYDfY2EodI9ogT/LGr9Lm/+u4OFPvmN9VN6UG+s0DgJjWvpbmuHL/ZIRwMEn/tp
uneaLTO7h1dCrXC849PiJ8wSkGzBnuJQUbXnABEBAAG0QEdvb2dsZSBDbG91ZCBQ
YWNrYWdlcyBBdXRvbWF0aWMgU2lnbmluZyBLZXkgPGdjLXRlYW1AZ29vZ2xlLmNv
bT6JAT4EEwECACgFAlUd6rICGy8FCQWjmoAGCwkIBwMCBhUIAgkKCwQWAgMBAh4B
AheAAAoJEDdGwginMXsPcLcIAKi2yNhJMbu4zWQ2tM/rJFovazcY28MF2rDWGOnc
9giHXOH0/BoMBcd8rw0lgjmOosBdM2JT0HWZIxC/Gdt7NSRA0WOlJe04u82/o3OH
WDgTdm9MS42noSP0mvNzNALBbQnlZHU0kvt3sV1YsnrxljoIuvxKWLLwren/GVsh
FLPwONjw3f9Fan6GWxJyn/dkX3OSUGaduzcygw51vksBQiUZLCD2Tlxyr9NvkZYT
qiaWW78L6regvATsLc9L/dQUiSMQZIK6NglmHE+cuSaoK0H4ruNKeTiQUw/EGFaL
ecay6Qy/s3Hk7K0QLd+gl0hZ1w1VzIeXLo2BRlqnjOYFX4CwAgADmQENBFrBaNsB
CADrF18KCbsZlo4NjAvVecTBCnp6WcBQJ5oSh7+E98jX9YznUCrNrgmeCcCMUvTD
RDxfTaDJybaHugfba43nqhkbNpJ47YXsIa+YL6eEE9emSmQtjrSWIiY+2YJYwsDg
sgckF3duqkb02OdBQlh6IbHPoXB6H//b1PgZYsomB+841XW1LSJPYlYbIrWfwDfQ
vtkFQI90r6NknVTQlpqQh5GLNWNYqRNrGQPmsB+NrUYrkl1nUt1LRGu+rCe4bSaS
mNbwKMQKkROE4kTiB72DPk7zH4Lm0uo0YFFWG4qsMIuqEihJ/9KNX8GYBr+tWgyL
ooLlsdK3l+4dVqd8cjkJM1ExABEBAAG0QEdvb2dsZSBDbG91ZCBQYWNrYWdlcyBB
dXRvbWF0aWMgU2lnbmluZyBLZXkgPGdjLXRlYW1AZ29vZ2xlLmNvbT6JAT4EEwEC
ACgFAlrBaNsCGy8FCQWjmoAGCwkIBwMCBhUIAgkKCwQWAgMBAh4BAheAAAoJEGoD
CyG6B/T78e8H/1WH2LN/nVNhm5TS1VYJG8B+IW8zS4BqyozxC9iJAJqZIVHXl8g8
a/Hus8RfXR7cnYHcg8sjSaJfQhqO9RbKnffiuQgGrqwQxuC2jBa6M/QKzejTeP0M
gi67pyrLJNWrFI71RhritQZmzTZ2PoWxfv6b+Tv5v0rPaG+ut1J47pn+kYgtUaKd
sJz1umi6HzK6AacDf0C0CksJdKG7MOWsZcB4xeOxJYuy6NuO6KcdEz8/XyEUjIuI
OlhYTd0hH8E/SEBbXXft7/VBQC5wNq40izPi+6WFK/e1O42DIpzQ749ogYQ1eode
xPNhLzekKR3XhGrNXJ95r5KO10VrsLFNd8KwAgAD
=ssty
-----END PGP ARMORED FILE-----`;
}


module.exports.ra_active_fn_name = DIAG.activeName;

