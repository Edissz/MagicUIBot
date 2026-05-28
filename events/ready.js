const { SUPPORT_PANEL_CHANNEL_ID } = require('../utils/supportV2');
const { configuredVoiceChannelId, startVoicePresence } = require('../utils/voicePresence');

async function syncSlashCommands(client) {
  const slashCommands = [...client.commands.values()]
    .filter(command => command.data)
    .map(command => command.data.toJSON());

  if (!slashCommands.length) return;

  const guildId = process.env.GUILD_ID || '1151315619246002176';
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  const manager = guild?.commands || client.application.commands;
  const existing = await manager.fetch();

  for (const commandData of slashCommands) {
    const current = existing.find(command => command.name === commandData.name);
    if (current) await manager.edit(current.id, commandData);
    else await manager.create(commandData);
  }
}

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Ready as ${client.user.tag}`);

    try {
      await syncSlashCommands(client);
      console.log(`Slash commands synced. Support panel channel: ${SUPPORT_PANEL_CHANNEL_ID}`);
    } catch (err) {
      console.error('Failed to sync slash commands:', err);
    }

    if (process.env.VOICE_AUTOJOIN !== 'false') {
      const channelId = configuredVoiceChannelId();

      startVoicePresence(client, channelId)
        .then(({ channel }) => {
          console.log(`Voice presence connected to ${channel.name} (${channel.id}).`);
        })
        .catch(err => {
          console.error(`Failed to join voice channel ${channelId}:`, err.message);
        });
    }
  }
};
