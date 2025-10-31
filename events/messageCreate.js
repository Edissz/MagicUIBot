const processedLocal = new Set();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot || !message.content) return;

    const prefix = client.prefix || '!';
    if (!message.content.startsWith(prefix)) return;

    if (!client._cmdProcessed) client._cmdProcessed = new Set();
    if (message._handledCmd) return;
    message._handledCmd = true;

    if (processedLocal.has(message.id)) return;
    processedLocal.add(message.id);

    if (client._cmdProcessed.has(message.id)) return;
    client._cmdProcessed.add(message.id);

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
      console.log(`✅ Ran command: ${commandName}`);
    } catch (err) {
      console.error(`❌ Error executing command ${commandName}:`, err);
      await message.reply('⚠️ Error executing this command.');
    } finally {
      setTimeout(() => {
        processedLocal.delete(message.id);
        client._cmdProcessed.delete(message.id);
        if (message._handledCmd) delete message._handledCmd;
      }, 30000);
    }
  },
};
