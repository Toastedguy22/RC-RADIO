const counts = new Map();

function nextCount(guildId) {
  const value = (counts.get(guildId) || 0) + 1;
  counts.set(guildId, value);
  return value;
}

module.exports = { nextCount };
