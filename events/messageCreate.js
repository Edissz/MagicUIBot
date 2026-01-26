module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const prefix = client.prefix || "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
      console.log(`✅ Command executed: ${commandName}`);
    } catch (err) {
      console.error(`❌ Error running ${commandName}:`, err);
      try { await message.reply("⚠️ Error executing this command."); } catch { }
    }
  },
};
