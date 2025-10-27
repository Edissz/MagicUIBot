require('dotenv').config();
const express = require('express');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const lockPath = path.join(__dirname, '.magicui.lock');
try {
  const fd = fs.openSync(lockPath, 'wx');
  fs.writeFileSync(fd, String(process.pid));
  fs.closeSync(fd);
  process.on('exit', () => { try { fs.unlinkSync(lockPath); } catch {} });
  process.on('SIGINT', () => { try { fs.unlinkSync(lockPath); } catch {} ; process.exit(0) });
  process.on('SIGTERM', () => { try { fs.unlinkSync(lockPath); } catch {} ; process.exit(0) });
} catch {
  console.log('⚠️ Another bot process is running. Exiting.');
  process.exit(0);
}

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
  const p = path.join(commandsPath, f);
  delete require.cache[require.resolve(p)];
  try {
    const cmd = require(p);
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

if (!global.__boundEvents) global.__boundEvents = new Set();

for (const f of eventFiles) {
  const p = path.join(eventsPath, f);
  delete require.cache[require.resolve(p)];
  try {
    const ev = require(p);
    if (!ev?.name || typeof ev.execute !== 'function') continue;

    if (global.__boundEvents.has(ev.name)) client.removeAllListeners(ev.name);
    global.__boundEvents.add(ev.name);

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
app.listen(PORT, () => console.log(`✅ KeepAlive running on port ${PORT} (pid ${process.pid})`));

client.once('ready', () => {
  console.log(`✅ Bot is online and ready! pid=${process.pid}`);
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

if (!client.isReady()) {
  client.login(process.env.TOKEN).catch(console.error);
}
