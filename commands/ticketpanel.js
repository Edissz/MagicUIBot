const { PermissionsBitField } = require('discord.js');
const {
  SILENT_MENTIONS,
  SUPPORT_PANEL_CHANNEL_ID,
  V2_FLAGS,
  buildSupportPanelComponents
} = require('../utils/supportV2');

const PANEL_COOLDOWN_MS = 30000;

module.exports = {
  name: 'ticketpanel',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('<:cross:1430525603701850165> You lack permission.');
    }

    const targetChannel = await message.guild.channels.fetch(SUPPORT_PANEL_CHANNEL_ID).catch(() => null);
    if (!targetChannel || !targetChannel.isTextBased()) {
      return message.reply('<:cross:1430525603701850165> I could not find the support panel channel.');
    }

    if (!client.__panelCooldown) client.__panelCooldown = new Map();
    const last = client.__panelCooldown.get(targetChannel.id) || 0;
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      return message.reply('<:cross:1430525603701850165> Please wait before sending another panel.');
    }
    client.__panelCooldown.set(targetChannel.id, Date.now());

    await targetChannel.send({
      components: buildSupportPanelComponents(),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });

    return message.reply(`<:check:1430525546608988203> Ticket panel posted in ${targetChannel}.`);
  }
};
