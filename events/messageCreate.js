const fs = require("fs")
const { PermissionsBitField } = require("discord.js")
const { handleTicketMessage } = require("../utils/ticketStats")

let stats = { responses: 0, minutes: 0 }
if (fs.existsSync("./responseStats.json")) {
  try {
    stats = JSON.parse(fs.readFileSync("./responseStats.json", "utf8"))
  } catch {}
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    try {
      if (!message || !message.guild) return
      if (message.author?.bot) return

      await handleTicketMessage(message, client)

      const prefix = client.prefix || "!"
      if (message.content && message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/\s+/)
        const cmdName = (args.shift() || "").toLowerCase()
        if (!cmdName) return

        const command = client.commands.get(cmdName)
        if (!command || typeof command.execute !== "function") return

        try {
          await command.execute(message, args, client)
          console.log(`✅ Command executed: ${cmdName}`)
        } catch (err) {
          console.error(err)
          try {
            await message.reply("⚠️ Command error.")
          } catch {}
        }
        return
      }

      if (!message.member) return
      if (!message.channel?.topic) return
      if (!message.channel.topic.includes("OWNER:")) return

      if (!client.__wait) client.__wait = {}
      const cid = message.channel.id

      const isStaff =
        message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        message.member.roles.cache.some((r) =>
          ["Moderator", "Administrator", "Manager"].includes(r.name)
        )

      if (!isStaff) {
        client.__wait[cid] = Date.now()
        return
      }

      if (client.__wait[cid]) {
        const diffMs = Date.now() - client.__wait[cid]
        const mins = Math.min(120, Math.max(1, Math.round(diffMs / 60000)))

        stats.responses += 1
        stats.minutes += mins

        try {
          fs.writeFileSync("./responseStats.json", JSON.stringify(stats))
        } catch {}

        delete client.__wait[cid]
      }
    } catch (err) {
      console.error("❌ messageCreate error:", err)
    }
  }
}
