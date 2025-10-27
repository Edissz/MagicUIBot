const processedLocal = new Set();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const prefix = client.prefix || '!';
    if (!message.content.startsWith(prefix)) return;

    if (!client.__processedMessages) client.__processedMessages = new Set();

    if (message.__handled) return;
    message.__handled = true;

    if (processedLocal.has(message.id)) return;
    processedLocal.add(message.id);

    if (client.__processedMessages.has(message.id)) return;
    client.__processedMessages.add(message.id);

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        processedLocal.delete(message.id);
        client.__processedMessages?.delete(message.id);
        if (message.__handled) delete message.__handled;
      }, 30000);
    }
  },
};
