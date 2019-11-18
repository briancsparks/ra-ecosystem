
const sg        = require('sg-clihelp');
const AWS       = require('aws-sdk');
const route53   = new AWS.Route53();

const [x,y, action, domain] = process.argv;

if (require.main === module) {
  sg.runTopAsync(main);
}


async function main() {
  require('loud-rejection/register');
  require('exit-on-epipe');

  var result = 'notrun';

  try {
    const {HostedZones} = await route53.listHostedZonesByName({DNSName: domain}).promise();

    if (HostedZones.length > 0) {
      const zone = HostedZones[0];
      if (zone.Name === `${domain}.`) {
        const HostedZoneId = zone.Id;
        const ChangeBatch = changeBatch();
        const {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();
        result = await route53.waitFor('resourceRecordSetsChanged', {Id: ChangeInfo.Id}).promise();
      }
    }
  } catch(err) {
    console.error(err);
    process.exit(3);
  }

  return [null, result];
}

function changeBatch() {
  return {
    Changes: [{
      Action: action,
      ResourceRecordSet: {
        Name: `_acme-challenge.${process.env.CERTBOT_DOMAIN}.`,
        ResourceRecords: [{Value:`"${process.env.CERTBOT_VALIDATION}"`}],
        TTL: 30,
        Type: "TXT"
      }
    }],
  };
}

