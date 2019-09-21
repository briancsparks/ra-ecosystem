
module.exports.safeJSONStringify = safeJSONStringify;

function safeJSONStringify(json) {
  try {
    return JSON.stringify(json);
  } catch (err) {
    console.error(`Failed to stringify JSON`, err);
  }

  return '';
}
