

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const awsDefs                 = require('../aws-defs');
const libAws                  = require('../aws');
const libVpc                  = require('./vpc');
const cloudInit               = require('../sh/cloud-init');
const fs                      = require('fs');
const path                    = require('path');

const mod                     = ra.modSquad(module, 'quickNetEc2');

const awsFilters              = libAws.awsFilters;
const awsFilter               = libAws.awsFilter;
const awsKey                  = libAws.awsKey;

const ec2 = libAws.awsService('EC2');
const iam = libAws.awsService('IAM');

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
    const ImageIds          = rax.arg(argv, 'ImageIds,images', {array:true});
    const latest            = rax.arg(argv, 'latest');

    const params = sg.smartExtend({Owners, ExecutableUsers, Filters, ImageIds});
    return describeImages(params, rax.opts({}), function(err, data, ...rest) {
      var   result = data;

      if (latest) {
        result = _.last(_.sortBy(data.Images || [], 'CreationDate'));
      }

      return callback(err, result, ...rest);
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

    const Owners            = ['099720109477'];
    const filters           = awsFilters({name:['ubuntu/images/hvm-ssd/ubuntu-xenial-16.04-amd64-server-????????'],state:['available']});
    const latest            = rax.arg(argv, 'latest');

    return getAmis(rax.opts({Owners, ...filters, latest}), rax.opts({}), callback);
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
    const InstanceType          = rax.arg(argv, 'InstanceType,type', {required:true});
    const classB                = rax.arg(argv, 'classB,b');
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

    if (rax.argErrors())    { return rax.abort(); }

    if (!BlockDeviceMappings) {
      if (!rootVolumeSize)  {
        return rax.abort(`Must provide BlockDeviceMappings or rootVolumeSize.`);
      }
      BlockDeviceMappings = [{DeviceName: 'xvdh', Ebs:{VolumeSize: rootVolumeSize}}];
    }

    var   InstanceId;
    var   userdata;
    return rax.__run2({result:{}}, callback, [function(my, next, last) {

      if (!uniqueName)  { return next(); }
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

        if (count > 0) {
          my.result = {Instance: theInstance};
          return callback(null, my);
        }

        return next();
      });

    }, function(my, next) {
      if (ImageId)  { return next(); }

      return getUbuntuLtsAmis({latest:true}, {}, function(err, data) {
        ImageId = data.ImageId;
        return next();
      });

    }, function(my, next) {
      if (rax.argErrors({ImageId}))                                                   { return rax.abort(); }
      if (SecurityGroupIds[0].startsWith('sg-') || SubnetId.startsWith('subnet-'))    { return next(); }

      if (rax.argErrors({classB}))    { return rax.abort(); }

      return getSubnets({classB, SecurityGroupIds: SecurityGroupIds[0], SubnetId}, {}, function(err, data) {
        if (sg.ok(err, data)) {
          SecurityGroupIds  = sg.pluck(data.securityGroups, 'GroupId');
          SubnetId          = (data.subnets.filter(s => s.AvailabilityZone.endsWith(az))[0]   || data.subnets[0] || {}).SubnetId;
        }
        return next();
      });

    }, function(my, next) {

      const userdataEnv       = readJsonFile(envJsonFile) || {};
      const userdataFilename  = path.join(__dirname, 'userdata', `${distro}.sh`);

      calling(`fs.readFile ${userdataFilename}`);
      return fs.readFile(userdataFilename, 'utf8', function(err, userdata_) {
        if (!sg.ok(err, userdata_))    { return abort(err, `fail reading ${distro}`); }

        userdata = userdata_;
        userdata  += `\n`;
        userdata  += `echo UserData script is done for ${uniqueName || 'instance'}`;
        userdata  += `\n`;

        userdata = sg.reduce(userdata.split('\n'), [], (m, line) => {
          if (!line.match(/quicknetuserdataenvcursor/i)) { return [...m, line]; }

          var newlines = sg.reduce(_.isObject(userdataOpts) ? userdataOpts : {}, [], (m, v, k) => {
            var   newline = `${k}="${v === true ? '1' : v}"`;
            if (v === false) {
              newline = `unset ${k}`;
            }

            return [...m, newline];
          });

          newlines = sg.reduce(userdataEnv, newlines, (m, v, k) => {
            const newline = `echo '${k}="${v === true ? '1' : v === false ? '0' : v}"' >> /etc/environment`;

            return [...m, newline];
          });
          newlines.push(line);

          return [ ...m, ...newlines ];
        }).join('\n');

        return next();
      });

    }, function(my, next) {
      var UserData;
      var params = {};

      if (uniqueName) {
        params.TagSpecifications = [{ResourceType:'instance', Tags:[{Key:'uniqueName', Value:uniqueName},{Key:'Name', Value:uniqueName}]}];
      }

      if (userdata) {
        UserData   = Buffer.from(userdata).toString('base64');
      }

      if (iamName) {
        params.IamInstanceProfile = {Name: iamName};
      }

      params = sg.merge(AllAwsParams, params, {ImageId, InstanceType, KeyName, SecurityGroupIds, SubnetId, MaxCount, MinCount, UserData});
      return runInstances(params, rax.opts({}), function(err, data) {

        my.result   = {Instance: data.Instances[0]};
        InstanceId  = my.result.Instance.InstanceId;

        return next();
      });

    }, function(my, next) {
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
      return next();
    }]);
  });
}});

function readJsonFile(filename_) {
  const filename = path.join(process.cwd(), filename_);
  // console.error(`rjf`, {filename});
  if (!fs.existsSync(filename)) { return; }

  return require(filename);
}
