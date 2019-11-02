'use strict';

module.exports = mkClientAndSessionIds;

function mkClientAndSessionIds(marker_, argv, Body) {
  var   marker    = marker_         || 'Xx';
  var   sessionId = argv.sessionId  || Body.sessionId;
  var   clientId  = argv.clientId   || Body.clientId;

  if (!clientId) {
    if (!sessionId) {
      // Make both
      sessionId = `${mkClientId(marker)}-${mkSessionTime()}`;
      return mkClientAndSessionIds(marker, {sessionId});
    }

    // sessionId, but not clientId
    clientId = (sessionId.split('-')[0]) || mkClientId(marker);
    return {clientId, sessionId};
  }

  // We have clientId, do we have sessionId?
  if (!sessionId) {
    sessionId = `${clientId}-${mkSessionTime()}`;
  }

  return {clientId, sessionId};
}

const letters     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const lettersLen  = letters.length;
const alphabet    = letters + '0123456789';
const alphaLen    = alphabet.length;

function randItem(max) {
  return alphabet[Math.floor(Math.random() * Math.floor(max))];
}

const clientIdLen = 64;
function mkClientId(marker) {
  var id = randItem(lettersLen);
  for (let i = 1; i < clientIdLen; ++i) {
    id += randItem(alphaLen);
  }

  return `${id}${marker}`;
}

function mkSessionTime() {
  const now = new Date();
  return '' +
    pad(4, now.getUTCFullYear()) +
    pad(2, now.getUTCMonth()+1) +
    pad(2, now.getUTCDate()) +
    pad(2, now.getUTCHours()) +
    pad(2, now.getUTCMinutes()) +
    pad(2, now.getUTCSeconds()) +
    pad(3, now.getUTCMilliseconds());
}

function pad(len, x_, ch_) {
  var x   = ''+x_;
  var ch  = ch_ || '0';

  while (x.length < len) {
    x = ch + x;
  }

  return x;
}
