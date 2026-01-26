module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const prefix = client.prefix || "!";
    const content = message.content || "";
    if (!content.startsWith(prefix)) return;

    const args = content.slice(prefix.length).trim().split(/\s+/);
    let commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    if (commandName === "tickewtpanel") commandName = "ticketpanel";

    const command = client.commands.get(commandName);
    if (!command) return;

    console.log(`CMD: ${commandName} by ${message.author.tag} in #${message.channel.name}`);

    try {
      await command.execute(message, args, client);
      console.log(`✅ OK: ${commandName}`);
    } catch (err) {
      console.error(`❌ FAIL ${commandName}:`, err);
      try { await message.reply("⚠️ Error executing this command."); } catch { }
    }
  },
};
