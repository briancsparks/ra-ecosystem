

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const awsDefs                 = require('../aws-defs');
const libAws                  = require('../aws');
const cloudInit               = require('../sh/cloud-init');
const fs                      = require('fs');
const path                    = require('path');

const mod                     = ra.modSquad(module, 'quickNetEc2');

const awsFilters              = libAws.awsFilters;
const awsFilter               = libAws.awsFilter;

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
  const { fra }   = ractx.quickNetEc2__getAmis;

  return fra.iwrap(function(abort, calling) {
    const { describeImages } = libAws.awsFns(ec2, 'describeImages', fra.opts({}), abort);

    const Owners            = fra.arg(argv, 'Owners,owners', {array:true});
    const ExecutableUsers   = fra.arg(argv, 'ExecutableUsers,users', {array:true});
    const Filters           = fra.arg(argv, 'Filters');
    const ImageIds          = fra.arg(argv, 'ImageIds,images', {array:true});
    const latest            = fra.arg(argv, 'latest');

    const params = sg.smartExtend({Owners, ExecutableUsers, Filters, ImageIds});
    return describeImages(params, fra.opts({}), function(err, data, ...rest) {
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
  const { fra }   = ractx.quickNetEc2__getAmazonLinuxAmis;

  return fra.iwrap(function(abort, calling) {
    const { getAmis } = fra.loads('getAmis', fra.opts({}), abort);

    const ecs               = fra.arg(argv, 'ecs');
    const v2                = fra.arg(argv, 'v2');
    const name              = (v2 ?
                                  (ecs ? 'amzn2-ami-ecs-hvm-2.0.20190127-x86_64-ebs'
                                       : 'amzn2-ami-hvm-2.0.????????-x86_64-gp2')
                                  : 'amzn-ami-hvm-????.??.?.????????-x86_64-gp2');
    const Owners            = 'amazon';
    const filters           = awsFilters({name:[name],state:['available']});
    const latest            = fra.arg(argv, 'latest');

    return getAmis(fra.opts({Owners, ...filters, latest}), fra.opts({}), function(err, data) {
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
  const { fra }   = ractx.quickNetEc2__getUbuntuLtsAmis;

  return fra.iwrap(function(abort, calling) {
    const { getAmis } = fra.loads('getAmis', fra.opts({}), abort);

    const Owners            = ['099720109477'];
    const filters           = awsFilters({name:['ubuntu/images/hvm-ssd/ubuntu-xenial-16.04-amd64-server-????????'],state:['available']});
    const latest            = fra.arg(argv, 'latest');

    return getAmis(fra.opts({Owners, ...filters, latest}), fra.opts({}), callback);
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
  const { fra }   = ractx.quickNetEc2__upsertInstance;

  return fra.iwrap(function(abort, calling) {
    const { runInstances,describeInstances }  = libAws.awsFns(ec2, 'runInstances,describeInstances', fra.opts({}), abort);

    const uniqueName            = fra.arg(argv, 'uniqueName,unique');
    const ImageId               = fra.arg(argv, 'ImageId,image', {required:true});
    const InstanceType          = fra.arg(argv, 'InstanceType,type', {required:true});
    const KeyName               = fra.arg(argv, 'KeyName,key', {required:true});
    const SecurityGroupIds      = fra.arg(argv, 'SecurityGroupIds,sgs', {required:true, array:true});
    const SubnetId              = fra.arg(argv, 'SubnetId,subnet', {required:true});
    const iamName               = fra.arg(argv, 'iamName,iam')    || 'supercow';
    var   BlockDeviceMappings   = fra.arg(argv, 'BlockDeviceMappings,devices');
    const rootVolumeSize        = fra.arg(argv, 'rootVolumeSize,size', {def:8});
    const count                 = fra.arg(argv, 'count', {def:1});
    var   MaxCount              = fra.arg(argv, 'MaxCount,max') || count;
    var   MinCount              = fra.arg(argv, 'MinCount,min') || count;
    const distro                = fra.arg(argv, 'distro', {required:true});

    if (fra.argErrors())    { return fra.abort(); }

    if (!BlockDeviceMappings) {
      if (!rootVolumeSize)  {
        return fra.abort(`Must provide BlockDeviceMappings or rootVolumeSize.`);
      }
      BlockDeviceMappings = [{DeviceName: 'xvdh', Ebs:{VolumeSize: rootVolumeSize}}];
    }

    var   InstanceId;
    var   userdata;
    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      if (!uniqueName)  { return next(); }
      return describeInstances(awsFilters({"tag:uniqueName":[uniqueName]}), fra.opts({}), function(err, data) {

        var   theInstance;
        const count = sg.reduce(data.Reservations || [], 0, function(m0, reservations) {
          return sg.reduce(reservations.Instances || [], m0, function(m, instance) {
            const state = instance.State && instance.State.Name;
            if (state != 'shutting-down' && state !== 'terminated') {
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

      const userdataFilename = path.join(__dirname, 'userdata', `${distro}.sh`);

      calling(`fs.readFile ${userdataFilename}`);
      return fs.readFile(userdataFilename, 'utf8', function(err, userdata_) {
        if (!sg.ok(err, userdata_))    { return abort(err, `fail reading ${distro}`); }

        userdata = userdata_;
        return next();
      });

    }, function(my, next) {
      var UserData;
      var params = {};

      if (uniqueName) {
        params.TagSpecifications = [{ResourceType:'instance', Tags:[{Key:'uniqueName', Value:uniqueName}]}];
      }

      if (userdata) {
        UserData = Buffer.from(userdata).toString('base64');
      }

      if (iamName) {
        params.IamInstanceProfile = {Name: iamName};
      }

      params = sg.merge(params, {ImageId, InstanceType, KeyName, SecurityGroupIds, SubnetId, MaxCount, MinCount, UserData});
      return runInstances(params, fra.opts({}), function(err, data) {

        my.result   = {Instance: data.Instances[0]};
        InstanceId  = my.result.Instance.InstanceId;

        return next();
      });

    }, function(my, next) {
      return sg.until(function(again, last, count, elapsed) {
        return describeInstances({InstanceIds:[InstanceId]}, fra.opts({abort:false}), function(err, data) {
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

