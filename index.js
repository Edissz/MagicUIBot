require("dotenv").config()
const express = require("express")
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js")
const fs = require("fs")
const path = require("path")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
})

client.commands = new Collection()
client.prefix = "!"

const commandsPath = path.join(__dirname, "commands")
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
  const cmd = require(path.join(commandsPath, file))
  if (!cmd?.name) continue
  client.commands.set(cmd.name, cmd)
  if (Array.isArray(cmd.aliases)) {
    for (const a of cmd.aliases) {
      if (typeof a === "string" && a.trim().length) client.commands.set(a.trim().toLowerCase(), cmd)
    }
  }
}

const eventsPath = path.join(__dirname, "events")
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))) {
  const ev = require(path.join(eventsPath, file))
  if (!ev?.name || typeof ev.execute !== "function") continue
  const handler = (...args) => ev.execute(...args, client)
  if (ev.once) client.once(ev.name, handler)
  else client.on(ev.name, handler)
}

const app = express()
app.get("/", (_, res) => res.send("MagicUIBot OK"))
const PORT = process.env.PORT || 3000
app.listen(PORT)

client.once("ready", () => {
  console.log(`READY ${client.user.tag}`)
})

client.login(process.env.TOKEN)
