

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const { qm }                  = ra.get3rdPartyLib('quick-merge');
const fs                      = require('fs');
const path                    = require('path');
const MimeNode                = require('emailjs-mime-builder').default;
const jsyaml                  = require('js-yaml');
const awsDefs                 = require('../aws-defs');
const libAws                  = require('../aws');
const libVpc                  = require('./vpc');
const cloudInit               = require('../sh/cloud-init');

const mod                     = ra.modSquad(module, 'quickNetEc2');

const awsFilters              = libAws.awsFilters;
const awsFilter               = libAws.awsFilter;
const awsKey                  = libAws.awsKey;

const ec2                     = libAws.awsService('EC2');
const iam                     = libAws.awsService('IAM');
const s3                      = libAws.awsService('S3');

const MimeBuilder             = MimeNode;

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
 * Upsert an instance.
 */
mod.xport({upsertInstance: function(argv, context, callback) {

  /*
    Ubuntu 16.04 as of 1/25/2019
    ra invoke packages\quick-net\lib\ec2\ec2.js upsertInstance --image=ami-03a935aafa6b52b97 --distro=ubuntu --type=t3.small --key= --sgs= --subnet=
    ra invoke packages\quick-net\lib\ec2\ec2.js upsertInstance --image=ami-03a935aafa6b52b97 --distro=ubuntu --type=c5.xlarge --key= --sgs= --subnet=

    Amazon Linux 2 with ECS as of 1/25/2019
    ra invoke packages\quick-net\lib\ec2\ec2.js upsertInstance --image=ami-011a85ba0ae2013bf --distro=amazon2ecs --type=t3.small --key= --sgs= --subnet=
  */

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.quickNetEc2__upsertInstance;

  return rax.iwrap(function(abort, calling) {
    const { runInstances,describeInstances }  = libAws.awsFns(ec2, 'runInstances,describeInstances', rax.opts({}), abort);
    const { getSubnets }                      = rax.loads(libVpc, 'getSubnets', rax.opts({}), abort);
    const { getUbuntuLtsAmis }                = rax.loads('getUbuntuLtsAmis', rax.opts({}), abort);

    var   AllAwsParams          = sg.reduce(argv, {}, (m,v,k) => ( sg.kv(m, awsKey(k), v) || m ));

    const distro                = rax.arg(argv, 'distro', {required:true});
    const uniqueName            = rax.arg(argv, 'uniqueName,unique', {required: sg.modes().production});
    var   ImageId               = rax.arg(argv, 'ImageId,image');
    var   osVersion             = rax.arg(argv, 'osVersion,os-version');
    const InstanceType          = rax.arg(argv, 'InstanceType,instanceType,instance', {required:true});
    const classB                = rax.arg(argv, 'class_b,classB,b');
    var   az                    = rax.arg(argv, 'AvailabilityZone,az');
    const KeyName               = rax.arg(argv, 'KeyName,key', {required:true});
    var   SecurityGroupIds      = rax.arg(argv, 'SecurityGroupIds,sgs', {required:true, array:true});
    var   SubnetId              = rax.arg(argv, 'SubnetId,subnet', {required:true});
    const iamName               = rax.arg(argv, 'iamName,iam')    || 'supercow';
    var   BlockDeviceMappings   = rax.arg(argv, 'BlockDeviceMappings,devices');
    const rootVolumeSize        = rax.arg(argv, 'rootVolumeSize,size', {def:8});
    const count                 = rax.arg(argv, 'count', {def:1});
    var   MaxCount              = rax.arg(argv, 'MaxCount,max') || count;
    var   MinCount              = rax.arg(argv, 'MinCount,min') || count;
    const DryRun                = rax.arg(argv, 'DryRun,dry-run');
    const envJsonFile           = rax.arg(argv, 'envjson');
    var   userdataOpts          = rax.arg(argv, 'userdata_opts');   // An object
    const moreShellScript       = rax.arg(argv, 'moreshellscript')    || '';
    const cloudInitData         = rax.arg(argv, 'cloudInit,ci')       || {};
    const roleKeys              = rax.arg(argv, 'roleKeys');

    if (rax.argErrors())    { return rax.abort(); }

    if (!BlockDeviceMappings) {
      // if (!rootVolumeSize)  {
      //   return rax.abort(`Must provide BlockDeviceMappings or rootVolumeSize.`);
      // }
      if (rootVolumeSize)  {
        BlockDeviceMappings = [{DeviceName: '/dev/sda1', Ebs:{VolumeSize: rootVolumeSize}}];
      }
    }

    var   InstanceId;
    var   userDataScript, mimeArchive;
    return rax.__run2({result:{}}, callback, [function(my, next, last) {

      // Itempotentcy -- use uniqueName so you can upsertInstance many times, and only launch once
      if (!uniqueName)  { return next(); }

      // They sent in a uniqueName. See if it already exists
      return describeInstances(awsFilters({"tag:uniqueName":[uniqueName]}), rax.opts({}), function(err, data) {

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
          my.result = {Instance: theInstance};
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
      const userdataEnv           = readJsonFile(envJsonFile) || {};
      const shellscriptFilename   = path.join(__dirname, 'userdata', `${distro}.sh`);

      // Read the user-data script file
      calling(`fs.readFile ${shellscriptFilename}`);
      return fs.readFile(shellscriptFilename, 'utf8', function(err, userDataScript_) {
        if (!sg.ok(err, userDataScript_))    { return abort(err, `fail reading ${distro}`); }

        // Process the user-data script
        userDataScript  = fixUserDataScript(userDataScript_, {uniqueName, userdataOpts, userdataEnv, moreShellScript});

        return next();
      });

    }, function(my, next) {

      // Install all the stuff we install for every instance
      cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
        package_update: true,
        package_upgrade: true,
        packages: ['ntp', 'tree', 'htop', 'zip', 'unzip', 'nodejs', 'jq'],
        apt:      {
          preserve_sources_list: true,
          sources: {
            "nodesource.list": {
              key: nodesource_com_key(),
              source: `deb https://deb.nodesource.com/node_12.x ${osVersion} main`
            }
          }
        }
      });

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
          }
        });
      }

      // Install the web-tier? (nginx and certbot)
      if (userdataOpts.INSTALL_WEBTIER) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['nginx', 'nginx-module-njs', 'certbot', 'python-certbot-nginx'],
          apt:      {
            preserve_sources_list: true,
            sources: {
              "nginx.list": {
                key: nginx_org_key(),
                source: `deb https://nginx.org/packages/mainline/ubuntu ${osVersion} nginx`
              },

              certbotPpa: {
                source: `ppa:certbot/certbot`
              }
            }
          }
        });
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
          ],
        });
      }

      if (userdataOpts.MONGO_CLIENTS) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['mongodb-clients'],
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
          }
        });
      }

      // Install tools for dev-ops?
      if (userdataOpts.INSTALL_OPS) {
        cloudInitData['cloud-config'] = qm(cloudInitData['cloud-config'] || {}, {
          packages: ['python-pip'],
          runcmd: [
            "pip install --upgrade awscli",
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

        mimeArchive.appendChild(new MimeBuilder('text/cloud-config')
          .setContent(yaml)
          .setHeader('content-transfer-encoding', 'quoted-printable')                 /*  MUST use quoted-printable, so the lib does not use 'flowable' */
        );
      }

      return next();

    }, function(my, next) {

      // Pack up the params for runInstances

      var UserData;
      var params = {};

      // Tag with `uniqueName`
      if (uniqueName) {
        params.TagSpecifications = [{ResourceType:'instance', Tags:[{Key:'uniqueName', Value:uniqueName},{Key:'Name', Value:uniqueName}]}];
      }

      // Build up the cloud-init userdata
      const userdata = mimeArchive.build();
      if (userdata) {
        UserData   = Buffer.from(userdata).toString('base64');
      }

      // Add the instance-role profile name
      if (iamName) {
        params.IamInstanceProfile = {Name: iamName};
      }

      // Make the runInstances params, and launch
      params = sg.merge(AllAwsParams, params, {ImageId, InstanceType, KeyName, SecurityGroupIds, SubnetId, MaxCount, MinCount, UserData, BlockDeviceMappings, DryRun});
      return runInstances(params, rax.opts({}), function(err, data) {

        my.result   = {Instance: data.Instances[0]};
        InstanceId  = my.result.Instance.InstanceId;

        return next();
      });

    }, function(my, next) {

      // Must wait for launches
      return sg.until(function(again, last, count, elapsed) {
        return describeInstances({InstanceIds:[InstanceId]}, rax.opts({abort:false}), function(err, data) {
          if (err) {
            if (err.code === 'InvalidInstanceID.NotFound')    { return again(250); }
            return abort(err);
          }

          my.result = {Instance: data.Reservations[0].Instances[0]};
          return last();
        });
      }, next);

    }, function(my, next) {
      // Put stuff on S3 for the instance
      const namespace = process.env.NAMESPACE;
      const s3path = `s3://serverassist-net-state-store/quick-net/${namespace.toLowerCase()}`;
      return copyFileToS3(path.join(__dirname, 'instance-help', 'install-dev-tools'), s3path, function(err, data) {
        sg.debugLog(`Upload instance-help`, {err, data});
        return next();
      });
    }, function(my, next) {
      return next();
    }]);
  });
}});

function copyFileToS3(pathname, s3path, callback) {
  const filename = _.last(pathname.split(/[\\/]/));
  const {Bucket,Key} = parseS3Path(`${s3path}/${filename}`);
  const Body = fs.createReadStream(pathname);

  if (!Bucket)    { sg.logError(`NoBucket`, `sending uplaod`, {Bucket,Key,pathname,s3path}); return callback(`NoBucket`); }
  if (!Key)       { sg.logError(`NoKey`,    `sending uplaod`, {Bucket,Key,pathname,s3path}); return callback(`NoKey`); }
  if (!Body)      { sg.logError(`NoBody`,   `sending uplaod`, {Bucket,Key,pathname,s3path}); return callback(`NoBody`); }

  var upload = s3.upload({Bucket, Key, Body, ContentType:'text/plain'}, {partSize: 6 * 1024 * 1024});

  upload.on('httpUploadProgress', (progress) => {
    sg.debugLog(`uploading file`, {progress});
  });

  upload.send(function(err, data) {
    if (!sg.ok(err, data))  { sg.logError(err, `sending upload`, {Bucket, Key}); }

    return callback(err, data);
  });
}

function parseS3Path(s3path) {
  const m = s3path.match(/s3:[/][/]([^/]+)[/](.*)/);
  if (!m) { return; }

  const Bucket = m[1];
  const Key = m[2];

  return {Bucket,Key};
}

function readJsonFile(filename_) {
  if (!filename_) {
    return; /* undefined */
  }

  const filename = path.join(process.cwd(), filename_);
  if (!fs.existsSync(filename)) { return; }

  return require(filename);
}

function fixUserDataScript(shellscript_, options_) {
  const options = options_ || {};

  const uniqueName        = options.uniqueName;
  const userdataOpts      = options.userdataOpts;
  const userdataEnv       = options.userdataEnv;
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

        var   newline = `${k}="${v === true ? '1' : v}"`;
        if (v === false) {
          newline = `unset ${k}`;
        }

        return [...m, newline];
      });

      // env vars
      newlines = sg.reduce(userdataEnv, newlines, (m, v, k) => {
        const newline = `echo '${k}="${v === true ? '1' : v === false ? '0' : v}"' >> /etc/environment`;

        return [...m, newline];
      });
      newlines.push(line);

      return [ ...m, ...newlines ];
    }

    return [...m, line];
  }).join('\n');

  return shellscript;
}


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

