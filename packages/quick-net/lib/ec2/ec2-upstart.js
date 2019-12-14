if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);


const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-diag'), require('@sg0/sg-aws-json'));
const { _ }                   = sg;
const { qm }                  = ra.get3rdPartyLib('quick-merge');
const libAws                  = require('../aws');
const libTags                 = require('./tags');

const ec2                     = libAws.awsService('EC2');


const mod                     = ra.modSquad(module, 'quickNetEc2Upstart');
const DIAG                    = sg.DIAG(module);


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
mod.xport(DIAG.xport({upstartInstances: function(argv_, context_, callback) {
  const {diag, ...context}    = context_;

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

