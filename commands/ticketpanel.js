const { PermissionsBitField, MessageFlags } = require("discord.js");
const { buildTicketPanelComponents } = require("../utils/ticketStats");

const SUPPORT_PANEL_CHANNEL_ID = "1405208521871724605";
const PANEL_COOLDOWN_MS = 30000;

module.exports = {
  name: "ticketpanel",
  async execute(message, args, client) {
    const fail = async (text) => {
      try { await message.reply(text); return; } catch { }
      try { await message.author.send(text); } catch { }
    };

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return fail("<:cross:1430525603701850165> You lack permission.");
    }

    const guild = message.guild;

    const ch = await guild.channels.fetch(SUPPORT_PANEL_CHANNEL_ID).catch(() => null);
    if (!ch || !ch.isTextBased()) return fail("⚠️ Support panel channel not found.");

    const me = await guild.members.fetchMe().catch(() => null);
    if (me) {
      const perms = ch.permissionsFor(me);
      if (!perms?.has(PermissionsBitField.Flags.ViewChannel) || !perms?.has(PermissionsBitField.Flags.SendMessages)) {
        return fail("⚠️ I don’t have permission to view/send in the panel channel.");
      }
    }

    if (!client.__panelCooldown) client.__panelCooldown = new Map();
    const last = client.__panelCooldown.get(guild.id) || 0;
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      return fail("<:cross:1430525603701850165> Please wait before sending another panel.");
    }
    client.__panelCooldown.set(guild.id, Date.now());

    const panelMsg = await ch.send({
      components: buildTicketPanelComponents(client, guild),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    if (!client.ticketPanelInfo) client.ticketPanelInfo = {};
    client.ticketPanelInfo[guild.id] = { channelId: panelMsg.channel.id, messageId: panelMsg.id };

    return fail("<:check:1430525546608988203> Ticket panel posted.");
  },
};
