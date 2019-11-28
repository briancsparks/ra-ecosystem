
const sg                      = require('sg-flow');
const { awsService }          = require('../aws');
const route53                 = awsService('Route53');


const {crackFqdn}   = require('./utils');

module.exports.iterateRecords = function(argv, middleFn, endFn) {

  var {subdomain,domain,fqdn,ip}     = crackFqdn(argv);

  if (!domain)  { return endFn(new Error(`ENODOMAIN`)); }

  var callerIsDone;
  return route53.listHostedZonesByName({DNSName: domain}, function(err, data) {
    const {HostedZones} = data;

    return sg.__each(HostedZones, function(HostedZone, nextHostedZone) {
      if (callerIsDone) { return nextHostedZone(); }

      const HostedZoneId = HostedZone.Id;
      return route53.listResourceRecordSets({HostedZoneId}, function(err, data) {
        const {ResourceRecordSets} = data;

        return sg.__each(ResourceRecordSets, function(ResourceRecordSet, nextResourceRecordSet) {
          if (callerIsDone) { return nextResourceRecordSet(); }

          middleFn({HostedZoneId, ResourceRecordSet}, nextItemFn, doneFn);

          function nextItemFn() {
            return nextResourceRecordSet();
          }

          function doneFn() {
            callerIsDone = true;
            return nextResourceRecordSet();
          }
        }, function() {
          // Done with record sets
          return nextHostedZone();
        });
      });
    }, function() {
      // Done with the hosted zones
      return endFn();
    });
  });

};

if (require.main === module) {
  const domain = 'cdr0.net';
  module.exports.iterateRecords({domain}, function(ResourceRecordSet, nextItem, done) {
    var rrs =  ResourceRecordSet.ResourceRecords.map(x => x.Value).join(', ');
    console.log(`record: ${ResourceRecordSet.Type}::${ResourceRecordSet.Name}, ${rrs}`, {r:ResourceRecordSet.ResourceRecords});

    return nextItem();

  }, function() {
    console.log(`DONE`);

  });
}

