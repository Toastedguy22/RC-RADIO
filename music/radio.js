const stations = new Map();

function set(guildId, url) {
  stations.set(guildId, url);
  return url;
}

function stop(guildId) {
  stations.delete(guildId);
}

function get(guildId) {
  return stations.get(guildId) || null;
}

module.exports = { set, stop, get };
