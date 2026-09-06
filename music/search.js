const play = require('play-dl');

async function searchTrack(query, requestedBy) {
  const url = /^https?:\/\//i.test(query) ? query : null;
  const results = url ? [{ url, title: url, durationInSec: 0, thumbnails: [] }] : await play.search(query, { limit: 1, source: { youtube: 'video' } });
  const result = results[0];
  if (!result) throw new Error('No matching track found.');

  return {
    url: result.url,
    title: result.title || result.url,
    artist: result.channel?.name || 'Unknown artist',
    duration: result.durationInSec || 0,
    thumbnail: result.thumbnails?.[0]?.url || null,
    requestedBy
  };
}

async function createAudioStream(track) {
  return play.stream(track.url, { quality: 2, discordPlayerCompatibility: true });
}

module.exports = { searchTrack, createAudioStream };
