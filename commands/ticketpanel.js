const { PermissionsBitField } = require('discord.js');
const { sendSupportPanel } = require('../utils/supportSystem');

const PANEL_COOLDOWN_MS = 30000;

module.exports = {
  name: 'ticketpanel',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('<:cross:1430525603701850165> You lack permission.');
    }

    if (!client.__panelCooldown) client.__panelCooldown = new Map();
    const last = client.__panelCooldown.get(message.guild.id) || 0;
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      return message.reply('<:cross:1430525603701850165> Please wait before sending another support panel.');
    }
    client.__panelCooldown.set(message.guild.id, Date.now());

    try {
      const panel = await sendSupportPanel(message.guild);
      return message.reply(`<:check:1430525546608988203> V2 support panel posted in ${panel.channel}.`);
    } catch (err) {
      console.error('Failed to post support panel:', err);
      return message.reply('<:cross:1430525603701850165> I could not post the support panel. Please check the configured channel.');
    }
  }
};
