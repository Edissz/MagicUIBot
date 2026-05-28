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
    GatewayIntentBits.GuildVoiceStates,
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
  const runEvent = (...args) => {
    Promise.resolve(ev.execute(...args, client)).catch(err => {
      console.error(`Error in ${ev.name} event from ${f}:`, err);
    });
  };

  if (ev.once) client.once(ev.name, runEvent);
  else client.on(ev.name, runEvent);
  console.log(`✅ Loaded event: ${ev.name}`);
}

client.on('error', err => {
  console.error('Discord client error:', err);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled promise rejection:', err);
});

client.login(process.env.TOKEN)
  .then(() => console.log('✅ Bot is online and ready!'))
  .catch(err => console.error('❌ Login failed:', err));
