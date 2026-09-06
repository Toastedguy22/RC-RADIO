# RC-RADIO

A Discord music bot built with `discord.js`, `@discordjs/voice`, and `play-dl`.

## Setup

1. Create a Discord application and bot at the [Discord Developer Portal](https://discord.com/developers/applications).
2. Enable the `Guilds` and `Guild Voice States` intents, then invite the bot with the `bot` and `applications.commands` scopes plus permission to connect, speak, and send messages.
3. Install dependencies:

	```sh
	npm install
	```

4. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID` for fast test-server command registration.
5. Register slash commands:

	```sh
	npm run register
	```

6. Start the bot:

	```sh
	npm start
	```

## Included commands

Core playback includes `/play`, `/pause`, `/resume`, `/skip`, `/back`, `/stop`, `/join`, `/disconnect`, `/now-playing`, `/queue`, `/shuffle`, `/loop`, `/seek`, and `/volume`. Queue controls include view, clear, remove, move, reverse, and restore. Saved playlists, lyrics placeholder routing, always-on settings, and button controls are included in the same structure for further provider integrations.

The bot stores playlists and server settings in `music-data.json`, which is ignored by Git. YouTube search and stream extraction are handled by `play-dl`; direct URLs can also be passed to `/play`.

## Development check

```sh
npm run check
```