const { save, getGuildPlaylists } = require('./database');

function create(guildId, name) {
  const playlists = getGuildPlaylists(guildId);
  if (playlists[name]) throw new Error('That playlist already exists.');
  playlists[name] = [];
  save();
}

function add(guildId, name, track) {
  const playlists = getGuildPlaylists(guildId);
  if (!playlists[name]) throw new Error('Playlist not found.');
  playlists[name].push(track);
  save();
}

function remove(guildId, name, index) {
  const playlists = getGuildPlaylists(guildId);
  if (!playlists[name]) throw new Error('Playlist not found.');
  const removed = playlists[name].splice(index - 1, 1)[0];
  save();
  return removed;
}

module.exports = { create, add, remove, getGuildPlaylists };
