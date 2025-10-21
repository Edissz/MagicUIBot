const processed = new Set();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;
    const prefix = client.prefix || '!';
    if (!message.content.startsWith(prefix)) return;

    if (processed.has(message.id)) return;
    processed.add(message.id);

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => processed.delete(message.id), 15000);
    }
  },
};
