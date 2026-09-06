const { save, getGuildSettings } = require('./database');

function update(guildId, changes) {
  const settings = getGuildSettings(guildId);
  Object.assign(settings, changes);
  save();
  return settings;
}

module.exports = { update, getGuildSettings };
