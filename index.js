require("dotenv").config();
const express = require("express");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();
client.prefix = "!";
client.modlogChannelId = "1355260778965373000";

const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd?.name && typeof cmd.execute === "function") client.commands.set(String(cmd.name).toLowerCase(), cmd);
}

const eventsPath = path.join(__dirname, "events");
const registeredEvents = new Set();

for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))) {
  const ev = require(path.join(eventsPath, file));
  if (!ev?.name || typeof ev.execute !== "function") continue;

  if (registeredEvents.has(ev.name)) continue;
  registeredEvents.add(ev.name);

  if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
  else client.on(ev.name, (...args) => ev.execute(...args, client));
}

const app = express();
app.get("/", (_, res) => res.send("MagicUIBot OK"));
const PORT = process.env.PORT || 3000;
app.listen(PORT);

client.once("ready", () => {
  console.log(`READY ${client.user.tag} | PID ${process.pid}`);
});

client.login(process.env.TOKEN);
