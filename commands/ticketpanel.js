const { PermissionsBitField, MessageFlags } = require("discord.js");
const { buildTicketPanelComponents } = require("../utils/ticketStats");

const PANEL_CHANNEL_ID = "1405208521871724605";
const PANEL_COOLDOWN_MS = 30000;

module.exports = {
  name: "ticketpanel",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      try { await message.reply("<:cross:1430525603701850165> You lack permission."); } catch { }
      return;
    }

    const guild = message.guild;
    const ch = await guild.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
    if (!ch || !ch.isTextBased()) {
      try { await message.reply("⚠️ Support panel channel not found or not accessible."); } catch { }
      return;
    }

    const me = await guild.members.fetchMe().catch(() => null);
    if (me) {
      const perms = ch.permissionsFor(me);
      if (!perms || !perms.has(PermissionsBitField.Flags.ViewChannel) || !perms.has(PermissionsBitField.Flags.SendMessages)) {
        try { await message.reply("⚠️ I don’t have permission to view/send messages in the panel channel."); } catch { }
        return;
      }
    }

    if (!client.__panelCooldown) client.__panelCooldown = new Map();
    const last = client.__panelCooldown.get(guild.id) || 0;
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      try { await message.reply("<:cross:1430525603701850165> Please wait before sending another panel."); } catch { }
      return;
    }
    client.__panelCooldown.set(guild.id, Date.now());

    const panelMsg = await ch.send({
      components: buildTicketPanelComponents(client, guild),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    if (!client.ticketPanelInfo) client.ticketPanelInfo = {};
    client.ticketPanelInfo[guild.id] = { channelId: panelMsg.channel.id, messageId: panelMsg.id };

    try { await message.reply("<:check:1430525546608988203> Ticket panel posted."); } catch { }
  },
};
