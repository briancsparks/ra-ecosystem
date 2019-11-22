
/**
 * @file
 *
 *   The functions that interact with Route 53.
 */

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-diag');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-argv'));
const {_}                     = sg;
const { awsService }          = require('../aws');
const route53                 = awsService('Route53');

const mod                     = ra.modSquad(module, 'quickNetRoute53');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();
// const ARGV                    = sg.ARGV();

const dg                      = DIAG.dg;
const {cleanContext}          = sg;

module.exports.changeBatch    = changeBatch;

var manageRecord;

// =============================================================================================
DIAG.usage({ aliases: { setARecord: { args: {
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);
DIAG.activeDevelopment(`--subdomain=api --domain=example.com --ip=1.2.3.4 --ttl=330 --fire-and-forget --no-await-wait --debug`);
DIAG.activeDevelopment(`--subdomain=testsub --domain=briancsparks.net --ip=192.168.1.3 --ttl=330 --fire-and-forget --debug`);
// DIAG.activeName = 'setARecord';

mod.async(DIAG.async({setARecord: async function(argv, context) {
  return await manageRecord({Action:'UPSERT', Type:'A', ...argv}, context);
}}));

// =============================================================================================
DIAG.usage({ aliases: { deleteARecord: { args: {
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);
DIAG.activeDevelopment(`--subdomain=api --domain=example.com --debug`);
DIAG.activeDevelopment(`--subdomain=testsub --domain=briancsparks.net --ip=192.168.1.3 --debug`);
// DIAG.activeName = 'deleteARecord';

mod.async(DIAG.async({deleteARecord: async function(argv, context) {
  return await manageRecord({Action:'DELETE', Type:'A', ...argv}, context);
}}));

// =============================================================================================
mod.async({setTxtRecord: async function(argv, context) {
  return await manageRecord({Action:'UPSERT', Type:'TXT', ...argv}, context);
}});

// =============================================================================================
mod.async({deleteTxtRecord: async function(argv, context) {
  return await manageRecord({Action:'DELETE', Type:'TXT', ...argv}, context);
}});

DIAG.usage({ aliases: { manageRecord: { args: {
  private_        : 'private',
  fireAndForget   : 'ff',
  noAwaitWait     : 'no-wait',
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);
// DIAG.activeName = 'manageRecord';

// =============================================================================================
manageRecord =
mod.async(DIAG.async({manageRecord: async function(argv, context) {
  const diag    = DIAG.diagnostic({argv, context});

  var {Action,Type,subdomain,domain,fqdn,ip,ttl,
       comment,private_,fireAndForget,noAwaitWait,
  }                                                                   = crackFqdn(diag.args());

  if (!(diag.haveArgs({subdomain,domain,fqdn,Action,Type})))          { return diag.exit(); }
  if (Action !== 'DELETE' && !(diag.haveArgs({ip})))                  { return diag.exit(); }

  var hz, ChangeInfo, result ={};

  try {
    const {HostedZones} = hz = await route53.listHostedZonesByName({DNSName: domain}).promise();

    _.each(HostedZones, async function(zone) {
      // diag.i(`manageRecord(${Action},${Type})`, {zone});

      if (zone.Name === `${domain}.`) {
        if (!!(zone.Config ||{}).PrivateZone === !!private_) {
          result[zone.Name]   = result[zone.Name] || {};

          const HostedZoneId  = zone.Id;
          const ChangeBatch   = changeBatch(Action, Type, subdomain, domain, ip, comment, ttl);

          result[zone.Name]   = {HostedZoneId, ChangeBatch, ...result[zone.Name]};

          // Call Route 53 to do the operation
          diag.i(`manageRecord(${Action},${Type}) - setting ${fqdn} to ${ip}`, {HostedZoneId, ChangeBatch});
          ({ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise());
          result[zone.Name] = {ChangeInfo, ...result[zone.Name]};

          // Do not care about confirming, it is very slow
          if (fireAndForget) /* ---------------------------------------------------> */       { return; }

          // Start the waitFor operation.
          const finalResultPromise = route53.waitFor('resourceRecordSetsChanged', {Id: ChangeInfo.Id}).promise();
          result[zone.Name] = {finalResultPromise, ...result[zone.Name]};

          // Do not await it, let the caller do that
          if (noAwaitWait) /* -----------------------------------------------------> */       { return; }

          // Await confirmation
          diag.i(`manageRecord(${Action},${Type}) - waiting for (${fqdn} to ${ip})`, {HostedZoneId, ChangeBatch, ChangeInfo});

          result[zone.Name] = {finalResult: await finalResultPromise, ...result[zone.Name]};

          diag.i(`manageRecord(${Action},${Type}) - complete for (${fqdn} to ${ip})`, {HostedZoneId, ChangeBatch, ChangeInfo, result: result[zone.Name]});

        } else {
          diag.i(`manageRecord(${Action},${Type}) - skipping zone not right privateness`, {private:private_, zone});
        }
      }
    });

  } catch(err) {
    console.error(err);
    console.log(`Continuing`);
  }

  return result;
}}));

// =================================================================================================
function changeBatch(Action, Type, subdomain, domain, ip, Comment, ttl_) {
  const ResourceRecords   = ip && [{Value:`${ip}`}];
  const TTL               = (Action !== 'DELETE' ? (ttl_ || 300) : undefined);

  return sg.merge({
    Changes: [{
      Action,                                                   /* : 'UPSERT', */
      ResourceRecordSet: sg.merge({
        Name                : `${subdomain}.${domain}.`,
        ResourceRecords,
        Type,
        TTL                                                     /* : 30,*/
      })
    }],
    Comment
  });
}

// =================================================================================================
function crackFqdn(argv) {
  var {subdomain,domain,fqdn,...rest}    = argv;

  if (subdomain && domain) {
    fqdn = fqdn || `${subdomain}.${domain}`;
  } else {
    [subdomain, ...domain] = (fqdn ||'').split('.');
    domain = domain.join('.');
  }

  return {subdomain,domain,fqdn,...rest};
}

