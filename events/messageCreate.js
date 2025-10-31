const processedLocal = new Set();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!message.content) return;

    const prefix = client.prefix || '!';
    if (!message.content.startsWith(prefix)) return;

    if (!client.__commandMessages) client.__commandMessages = new Set();

    if (message.__commandHandled) return;
    message.__commandHandled = true;

    if (processedLocal.has(message.id)) return;
    processedLocal.add(message.id);

    if (client.__commandMessages.has(message.id)) return;
    client.__commandMessages.add(message.id);

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch {
      try { await message.reply('❌ Error running command.'); } catch {}
    } finally {
      setTimeout(() => {
        processedLocal.delete(message.id);
        client.__commandMessages?.delete(message.id);
        if (message.__commandHandled) delete message.__commandHandled;
      }, 30000);
    }
  },
};
