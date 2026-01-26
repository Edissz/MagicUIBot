require("dotenv").config();
const express = require("express");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");
const path = require("path");

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));

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

client.on("error", (e) => console.error("client error:", e));

client.commands = new Collection();
client.prefix = "!";
client.modlogChannelId = "1441524770083573770";

const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd?.name && typeof cmd.execute === "function") {
    client.commands.set(String(cmd.name).toLowerCase(), cmd);
  }
}

const eventsPath = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))) {
  const ev = require(path.join(eventsPath, file));
  if (!ev?.name || typeof ev.execute !== "function") continue;

  if (ev.name === "messageCreate" && file !== "messageCreate.js") continue;
  if (ev.name === "interactionCreate" && file !== "interactionCreate.js") continue;

  if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
  else client.on(ev.name, (...args) => ev.execute(...args, client));

  console.log(`EVENT LOADED: ${file} -> ${ev.name}`);
}

const app = express();
app.get("/", (_, res) => res.send("MagicUIBot OK"));
const PORT = process.env.PORT || 3000;
app.listen(PORT);

client.once("ready", () => {
  console.log(`READY ${client.user.tag} | PID ${process.pid}`);
});

client.login(process.env.TOKEN);
