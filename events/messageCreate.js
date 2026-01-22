module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    try {
      if (!message?.guild) return
      if (message.author?.bot) return

      const prefix = client.prefix || "!"
      const content = message.content || ""
      if (!content.startsWith(prefix)) return

      const args = content.slice(prefix.length).trim().split(/\s+/).filter(Boolean)
      const cmdName = (args.shift() || "").toLowerCase()
      if (!cmdName) return

      const command = client.commands.get(cmdName)
      if (!command || typeof command.execute !== "function") return

      await command.execute(message, args, client)
      console.log(`✅ Command executed: ${cmdName}`)
    } catch (err) {
      console.error("❌ messageCreate error:", err)
      try {
        await message.reply("⚠️ Command error.")
      } catch {}
    }
  }
}
