require('dotenv').config();
const express = require('express');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

if (global.__MagicUIBotLoaded) process.exit(0);
global.__MagicUIBotLoaded = true;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
client.prefix = '!';
client.modlogChannelId = '1355260778965373000';

const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const f of commandFiles) {
  try {
    const cmd = require(path.join(commandsPath, f));
    if (!cmd?.name) continue;
    client.commands.set(cmd.name, cmd);
    console.log(`✅ Loaded command: ${cmd.name}`);
  } catch (err) {
    console.error(`❌ Failed to load command ${f}:`, err);
  }
}

const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) fs.mkdirSync(eventsPath, { recursive: true });
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const f of eventFiles) {
  try {
    const ev = require(path.join(eventsPath, f));
    if (!ev?.name || typeof ev.execute !== 'function') continue;

    client.removeAllListeners(ev.name); // prevent duplicates
    if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
    else client.on(ev.name, (...args) => ev.execute(...args, client));

    console.log(`✅ Loaded event: ${ev.name}`);
  } catch (err) {
    console.error(`❌ Failed to load event ${f}:`, err);
  }
}

const app = express();
app.get('/', (_, res) => res.send('✅ MagicUIBot KeepAlive running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ KeepAlive running on port ${PORT}`));


client.once('ready', () => {
  console.log(`✅ Bot is online and ready!`);
  console.log(`✅ Logged in as ${client.user.tag}`);

  let lastPing = client.ws.ping;
  console.log(`Initial ping: ${lastPing}ms`);

  setInterval(() => {
    const ping = client.ws.ping;
    if (ping !== lastPing) {
      console.log(`Bot ping: ${ping}ms`);
      lastPing = ping;
    }
  }, 5000);
});

client.login(process.env.TOKEN);
