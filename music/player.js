const {
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType
} = require('@discordjs/voice');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { Queue } = require('./queue');
const { createAudioStream } = require('./search');
const { getGuildSettings } = require('./database');

const players = new Map();

function getPlayer(guildId) {
  return players.get(guildId) || null;
}

function getOrCreatePlayer(guild, voiceChannel) {
  let state = players.get(guild.id);
  if (state) {
    if (!state.connection || state.connection.joinConfig.channelId !== voiceChannel.id) {
      state.connection?.destroy();
      state.connection = joinVoiceChannel({ channelId: voiceChannel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });
      state.connection.subscribe(state.audioPlayer);
    }
    return state;
  }

  const audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
  const connection = joinVoiceChannel({ channelId: voiceChannel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });
  state = { guild, connection, audioPlayer, queue: new Queue(), loop: 'off', volume: getGuildSettings(guild.id).volume, textChannel: null, resource: null };
  connection.subscribe(audioPlayer);
  audioPlayer.on(AudioPlayerStatus.Idle, () => playNext(state));
  audioPlayer.on('error', error => {
    console.error(`Audio error in ${guild.name}:`, error.message);
    playNext(state);
  });
  players.set(guild.id, state);
  return state;
}

async function playNext(state) {
  if (state.loop === 'queue' && state.queue.current) state.queue.add(state.queue.current);
  const track = state.loop === 'track' && state.queue.current ? state.queue.current : state.queue.next();
  if (!track) {
    state.textChannel?.send('Queue finished.').catch(() => {});
    if (!getGuildSettings(state.guild.id).alwaysOn) disconnect(state.guild.id);
    return;
  }

  try {
    const stream = await createAudioStream(track);
    state.resource = createAudioResource(stream.stream, { inputType: stream.type === 'opus' ? StreamType.WebmOpus : StreamType.Arbitrary, inlineVolume: true });
    state.resource.volume?.setVolume(Math.max(0.01, state.volume / 100));
    state.audioPlayer.play(state.resource);
    await sendNowPlaying(state, track);
  } catch (error) {
    console.error('Could not play track:', error.message);
    state.textChannel?.send(`Could not play **${track.title}**. Skipping it.`).catch(() => {});
    playNext(state);
  }
}

async function sendNowPlaying(state, track) {
  if (!state.textChannel) return;
  const embed = new EmbedBuilder().setColor(0x2f80ed).setTitle('Now Playing').setDescription(`**${track.title}**\n${track.artist}`).setURL(track.url);
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music:back').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music:pause').setEmoji('⏯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music:skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music:shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music:stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger)
  );
  await state.textChannel.send({ embeds: [embed], components: [controls] });
}

function disconnect(guildId) {
  const state = players.get(guildId);
  if (!state) return;
  state.audioPlayer.stop(true);
  state.connection.destroy();
  players.delete(guildId);
}

function destroyAllPlayers() {
  for (const guildId of players.keys()) disconnect(guildId);
}

module.exports = { getPlayer, getOrCreatePlayer, playNext, disconnect, destroyAllPlayers };
