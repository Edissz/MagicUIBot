require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
  const cmd = require(path.join(commandsPath, f));
  client.commands.set(cmd.name, cmd);
  console.log(`✅ Loaded command: ${cmd.name}`);
}

const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) fs.mkdirSync(eventsPath, { recursive: true });
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
for (const f of eventFiles) {
  const ev = require(path.join(eventsPath, f));
  if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
  else client.on(ev.name, (...args) => ev.execute(...args, client));
  console.log(`✅ Loaded event: ${ev.name}`);
}

client.login(process.env.TOKEN)
  .then(() => console.log('✅ Bot is online and ready!'))
  .catch(err => console.error('❌ Login failed:', err));
