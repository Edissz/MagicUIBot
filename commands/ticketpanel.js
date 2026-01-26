const { PermissionsBitField, MessageFlags } = require("discord.js");
const { buildTicketPanelComponents } = require("../utils/ticketStats");

const SUPPORT_PANEL_CHANNEL_ID = "1405208521871724605";
const PANEL_COOLDOWN_MS = 30000;

module.exports = {
  name: "ticketpanel",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply("<:cross:1430525603701850165> You lack permission.");
    }

    const ch = await message.guild.channels.fetch(SUPPORT_PANEL_CHANNEL_ID).catch(() => null);
    if (!ch || !ch.isTextBased()) return message.reply("⚠️ Support panel channel not found.");

    if (!client.__panelCooldown) client.__panelCooldown = new Map();
    const last = client.__panelCooldown.get(message.guild.id) || 0;
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      return message.reply("<:cross:1430525603701850165> Please wait before sending another panel.");
    }

    let panelMsg;
    try {
      panelMsg = await ch.send({
        components: buildTicketPanelComponents(client, message.guild),
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch (e) {
      console.error("ticketpanel send failed:", e);
      return message.reply("⚠️ Failed to send the panel. Check logs for details.");
    }

    client.__panelCooldown.set(message.guild.id, Date.now());

    if (!client.ticketPanelInfo) client.ticketPanelInfo = {};
    client.ticketPanelInfo[message.guild.id] = { channelId: panelMsg.channel.id, messageId: panelMsg.id };

    return message.reply("<:check:1430525546608988203> Ticket panel posted.");
  },
};
