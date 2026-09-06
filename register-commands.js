require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { commandData } = require('./music/commands');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  throw new Error('DISCORD_TOKEN and CLIENT_ID are required in .env');
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const route = GUILD_ID
  ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
  : Routes.applicationCommands(CLIENT_ID);

rest.put(route, { body: commandData }).then(() => {
  console.log(`Registered ${commandData.length} command(s)${GUILD_ID ? ' in the test guild' : ' globally'}.`);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
