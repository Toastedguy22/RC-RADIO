require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { commands, handleInteraction } = require('./music/commands');
const { destroyAllPlayers } = require('./music/player');

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and add your bot token.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

client.commands = new Collection(commands.map(command => [command.name, command]));

client.once('ready', readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Serving ${readyClient.guilds.cache.size} server(s)`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  try {
    await handleInteraction(interaction);
  } catch (error) {
    console.error(error);
    const message = 'Something went wrong while handling that request.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

process.on('SIGINT', () => {
  destroyAllPlayers();
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
