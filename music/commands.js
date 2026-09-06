const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { getOrCreatePlayer, getPlayer, playNext, disconnect } = require('./player');
const { searchTrack } = require('./search');
const { findLyrics } = require('./lyrics');
const playlists = require('./playlists');
const { getGuildSettings } = require('./database');
const { update } = require('./settings');

const commandData = [
  new SlashCommandBuilder().setName('play').setDescription('Play a YouTube track or search term').addStringOption(option => option.setName('query').setDescription('URL or search').setRequired(true)),
  new SlashCommandBuilder().setName('join').setDescription('Join your voice channel'),
  new SlashCommandBuilder().setName('disconnect').setDescription('Leave voice and clear the player'),
  new SlashCommandBuilder().setName('pause').setDescription('Pause playback'),
  new SlashCommandBuilder().setName('resume').setDescription('Resume playback'),
  new SlashCommandBuilder().setName('skip').setDescription('Skip the current track'),
  new SlashCommandBuilder().setName('back').setDescription('Play the previous track'),
  new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue'),
  new SlashCommandBuilder().setName('now-playing').setDescription('Show the current track'),
  new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the upcoming queue'),
  new SlashCommandBuilder().setName('loop').setDescription('Set loop mode').addStringOption(option => option.setName('mode').setDescription('Loop mode').setRequired(true).addChoices({ name: 'Off', value: 'off' }, { name: 'Track', value: 'track' }, { name: 'Queue', value: 'queue' })),
  new SlashCommandBuilder().setName('volume').setDescription('Set playback volume').addIntegerOption(option => option.setName('percent').setDescription('0-100').setMinValue(0).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName('seek').setDescription('Seek within the current track').addIntegerOption(option => option.setName('seconds').setDescription('Position in seconds').setMinValue(0).setRequired(true)),
  new SlashCommandBuilder().setName('queue').setDescription('Manage the queue').addSubcommand(sub => sub.setName('view').setDescription('View the queue')).addSubcommand(sub => sub.setName('clear').setDescription('Clear upcoming tracks')).addSubcommand(sub => sub.setName('remove').setDescription('Remove an upcoming track').addIntegerOption(option => option.setName('position').setDescription('Queue position').setMinValue(1).setRequired(true))).addSubcommand(sub => sub.setName('move').setDescription('Move an upcoming track').addIntegerOption(option => option.setName('from').setDescription('Current position').setMinValue(1).setRequired(true)).addIntegerOption(option => option.setName('to').setDescription('New position').setMinValue(1).setRequired(true))).addSubcommand(sub => sub.setName('reverse').setDescription('Reverse upcoming tracks')).addSubcommand(sub => sub.setName('restore').setDescription('Restore the last track')),
  new SlashCommandBuilder().setName('lyrics').setDescription('Show lyrics for the current track').addBooleanOption(option => option.setName('synced').setDescription('Request synced lyrics')),
  new SlashCommandBuilder().setName('playlist').setDescription('Manage saved playlists').addSubcommand(sub => sub.setName('create').setDescription('Create a playlist').addStringOption(option => option.setName('name').setDescription('Playlist name').setRequired(true))).addSubcommand(sub => sub.setName('view').setDescription('View saved playlists')).addSubcommand(sub => sub.setName('add').setDescription('Add the current track').addStringOption(option => option.setName('name').setDescription('Playlist name').setRequired(true))).addSubcommand(sub => sub.setName('play').setDescription('Play a saved playlist').addStringOption(option => option.setName('name').setDescription('Playlist name').setRequired(true))),
  new SlashCommandBuilder().setName('settings').setDescription('View player settings'),
  new SlashCommandBuilder().setName('always-on').setDescription('Keep the bot connected when the queue ends').addBooleanOption(option => option.setName('enabled').setDescription('Enable always-on').setRequired(true))
].map(command => command.toJSON());

const commands = commandData.map(data => ({ name: data.name }));

function voiceChannel(interaction) {
  return interaction.member?.voice?.channel || null;
}

function getStateOrReply(interaction) {
  const state = getPlayer(interaction.guildId);
  if (!state) interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
  return state;
}

async function startTrack(interaction, query) {
  const channel = voiceChannel(interaction);
  if (!channel || channel.type !== ChannelType.GuildVoice) return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
  await interaction.deferReply();
  const track = await searchTrack(query, interaction.user.tag);
  const state = getOrCreatePlayer(interaction.guild, channel);
  state.textChannel = interaction.channel;
  state.queue.add(track);
  if (state.audioPlayer.state.status === AudioPlayerStatus.Idle) playNext(state);
  await interaction.editReply(`Added **${track.title}** to the queue.`);
}

async function handleQueue(interaction) {
  const state = getStateOrReply(interaction);
  if (!state) return;
  const action = interaction.options.getSubcommand();
  if (action === 'view') {
    const current = state.queue.current ? `**Currently playing:** ${state.queue.current.title}\n` : '';
    const next = state.queue.upNext.length ? state.queue.upNext.map((track, index) => `${index + 1}. ${track.title}`).join('\n') : 'Nothing queued.';
    return interaction.reply(`${current}\n**Up next:**\n${next}`);
  }
  if (action === 'clear') state.queue.clear();
  if (action === 'reverse') state.queue.upNext.reverse();
  if (action === 'remove') {
    const removed = state.queue.remove(interaction.options.getInteger('position'));
    if (!removed) return interaction.reply({ content: 'That queue position does not exist.', ephemeral: true });
  }
  if (action === 'move' && !state.queue.move(interaction.options.getInteger('from'), interaction.options.getInteger('to'))) return interaction.reply({ content: 'Those queue positions are invalid.', ephemeral: true });
  if (action === 'restore') {
    if (!state.queue.back()) return interaction.reply({ content: 'There is no previous track.', ephemeral: true });
    state.audioPlayer.stop();
  }
  return interaction.reply(`Queue updated: **${action}**.`);
}

async function handlePlaylist(interaction) {
  const action = interaction.options.getSubcommand();
  const name = interaction.options.getString('name');
  if (action === 'create') {
    playlists.create(interaction.guildId, name);
    return interaction.reply(`Created playlist **${name}**.`);
  }
  if (action === 'view') {
    const saved = playlists.getGuildPlaylists(interaction.guildId);
    const names = Object.entries(saved).map(([playlistName, tracks]) => `**${playlistName}** (${tracks.length} tracks)`).join('\n') || 'No playlists yet.';
    return interaction.reply(names);
  }
  if (action === 'add') {
    const state = getStateOrReply(interaction);
    if (!state?.queue.current) return;
    playlists.add(interaction.guildId, name, state.queue.current);
    return interaction.reply(`Added **${state.queue.current.title}** to **${name}**.`);
  }
  const savedTracks = playlists.getGuildPlaylists(interaction.guildId)[name];
  if (!savedTracks) return interaction.reply({ content: 'Playlist not found.', ephemeral: true });
  const channel = voiceChannel(interaction);
  if (!channel) return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
  const state = getOrCreatePlayer(interaction.guild, channel);
  state.textChannel = interaction.channel;
  savedTracks.forEach(track => state.queue.add(track));
  if (state.audioPlayer.state.status === AudioPlayerStatus.Idle) playNext(state);
  return interaction.reply(`Queued **${savedTracks.length}** tracks from **${name}**.`);
}

async function handleInteraction(interaction) {
  if (interaction.isButton()) {
    const state = getStateOrReply(interaction);
    if (!state) return;
    await interaction.deferUpdate();
    const action = interaction.customId.split(':')[1];
    if (action === 'pause') state.audioPlayer.state.status === AudioPlayerStatus.Paused ? state.audioPlayer.unpause() : state.audioPlayer.pause();
    if (action === 'skip') state.audioPlayer.stop();
    if (action === 'back') { state.queue.back(); state.audioPlayer.stop(); }
    if (action === 'shuffle') state.queue.shuffle();
    if (action === 'stop') { state.queue.clear(); disconnect(interaction.guildId); }
    return;
  }

  const name = interaction.commandName;
  if (name === 'play') return startTrack(interaction, interaction.options.getString('query'));
  if (name === 'join') {
    const channel = voiceChannel(interaction);
    if (!channel) return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
    getOrCreatePlayer(interaction.guild, channel).textChannel = interaction.channel;
    return interaction.reply('Joined your voice channel.');
  }
  if (name === 'disconnect' || name === 'stop') {
    const state = getPlayer(interaction.guildId);
    if (state) state.queue.clear();
    disconnect(interaction.guildId);
    return interaction.reply('Disconnected and cleared the queue.');
  }
  if (name === 'pause' || name === 'resume') {
    const state = getStateOrReply(interaction); if (!state) return;
    name === 'pause' ? state.audioPlayer.pause() : state.audioPlayer.unpause();
    return interaction.reply(name === 'pause' ? 'Paused.' : 'Resumed.');
  }
  if (name === 'skip') { const state = getStateOrReply(interaction); if (!state) return; state.audioPlayer.stop(); return interaction.reply('Skipped.'); }
  if (name === 'back') { const state = getStateOrReply(interaction); if (!state || !state.queue.back()) return interaction.reply({ content: 'There is no previous track.', ephemeral: true }); state.audioPlayer.stop(); return interaction.reply('Playing the previous track.'); }
  if (name === 'now-playing') { const state = getStateOrReply(interaction); if (!state) return; return interaction.reply(state.queue.current ? `Now playing **${state.queue.current.title}**.` : 'Nothing is playing.'); }
  if (name === 'shuffle') { const state = getStateOrReply(interaction); if (!state) return; state.queue.shuffle(); return interaction.reply('Shuffled the queue.'); }
  if (name === 'loop') { const state = getStateOrReply(interaction); if (!state) return; state.loop = interaction.options.getString('mode'); return interaction.reply(`Loop mode: **${state.loop}**.`); }
  if (name === 'volume') { const state = getStateOrReply(interaction); if (!state) return; state.volume = interaction.options.getInteger('percent'); state.resource?.volume?.setVolume(state.volume / 100); return interaction.reply(`Volume set to **${state.volume}%**.`); }
  if (name === 'seek') return interaction.reply({ content: 'Seeking is unavailable for live YouTube streams in this build.', ephemeral: true });
  if (name === 'queue') return handleQueue(interaction);
  if (name === 'playlist') return handlePlaylist(interaction);
  if (name === 'lyrics') return interaction.reply(await findLyrics());
  if (name === 'settings') return interaction.reply(`Volume: ${getGuildSettings(interaction.guildId).volume}%\nAlways on: ${getGuildSettings(interaction.guildId).alwaysOn ? 'on' : 'off'}`);
  if (name === 'always-on') { const settings = update(interaction.guildId, { alwaysOn: interaction.options.getBoolean('enabled') }); return interaction.reply(`Always-on is now **${settings.alwaysOn ? 'on' : 'off'}**.`); }
}

module.exports = { commandData, commands, handleInteraction };
