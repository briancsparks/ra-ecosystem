
const sg                      = require('sg0');

exports.getTag = function(obj = {}, tagName) {
  const tags = obj.Tags;
  if (!tags)                { return; }

  return sg.reduce(tags, '', (m, tag) => {
    if (tag.Key.toLowerCase() === tagName.toLowerCase()) {
      return tag.Value;
    }
    return m;
  });
};
