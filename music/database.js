const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(process.cwd(), 'music-data.json');
let data = { playlists: {}, settings: {} };

try {
  if (fs.existsSync(filePath)) data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (error) {
  console.warn('Could not read music-data.json; starting with empty data.', error.message);
}

function save() {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getGuildPlaylists(guildId) {
  data.playlists[guildId] ||= {};
  return data.playlists[guildId];
}

function getGuildSettings(guildId) {
  data.settings[guildId] ||= { loop: 'off', volume: 80, alwaysOn: false, djRole: null };
  return data.settings[guildId];
}

module.exports = { save, getGuildPlaylists, getGuildSettings };
