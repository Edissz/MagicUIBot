const { SUPPORT_CONFIG } = require('../utils/supportSystem');

async function upsertSlashCommands(client) {
  const slashCommands = [...client.commands.values()]
    .filter(command => command.data)
    .map(command => command.data.toJSON());

  if (!slashCommands.length) return;

  const guild = await client.guilds.fetch(SUPPORT_CONFIG.guildId).catch(() => null);
  const commandManager = guild?.commands || client.application.commands;
  const existingCommands = await commandManager.fetch();

  for (const commandData of slashCommands) {
    const existing = existingCommands.find(command => command.name === commandData.name);
    if (existing) await commandManager.edit(existing.id, commandData);
    else await commandManager.create(commandData);
  }
}

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Ready as ${client.user.tag}`);

    try {
      await upsertSlashCommands(client);
      console.log('Slash commands synced.');
    } catch (err) {
      console.error('Failed to sync slash commands:', err);
    }
  }
};
