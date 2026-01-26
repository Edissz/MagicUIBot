const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");

const BRAND_BLUE = 0x0b2a6f;
const CATEGORY_ID = "1405640921017745419";

function getContainer(client, guildId) {
  if (!client.__ticketStats) client.__ticketStats = {};
  if (!client.__ticketStats[guildId]) {
    client.__ticketStats[guildId] = {
      stats: { totalResponses: 0, totalMinutes: 0 },
      openTickets: {},
    };
  }
  return client.__ticketStats[guildId];
}

function getEstimatedMinutes(client, guild) {
  if (!client.__ticketStats) return null;
  const data = client.__ticketStats[guild.id];
  if (!data) return null;
  const { totalResponses, totalMinutes } = data.stats;
  if (!totalResponses || totalResponses <= 0) return null;
  return totalMinutes / totalResponses;
}

function formatEtaText(client, guild) {
  const minutes = getEstimatedMinutes(client, guild);
  if (!minutes) {
    return (
      "<a:48084loadingcircle:1439975825616408656> **Estimated claim time:** Not available yet.\n\n" +
      "We haven’t collected enough data. When staff is online, claims are usually quick."
    );
  }
  const rounded = Math.max(1, Math.round(minutes));
  const unit = rounded === 1 ? "minute" : "minutes";
  return `<a:48084loadingcircle:1439975825616408656> **Estimated claim time:** ~${rounded} ${unit}\n\nThis updates automatically based on recent claims.`;
}

function card({ title, body }) {
  const c = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  c.addTextDisplayComponents((t) => t.setContent(String(body || " ").trim() || " "));
  return c;
}

function buildTicketPanelComponents(client, guild) {
  const eta = formatEtaText(client, guild);

  const c1 = card({
    title: "Welcome to MagicUI Support",
    body:
      "<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**.\n" +
      "We help with access, billing, bugs, setup, and general questions.\n\n" +
      "Click **Contact Support** to start your request.",
  });

  const c2 = card({
    title: "Rules & When to Contact Support",
    body:
      "**Use this for:**\n" +
      "• Payment or billing issues\n" +
      "• Bug reports / broken components\n" +
      "• General support\n" +
      "• Rule violation reports\n" +
      "• Order or product issues\n\n" +
      "**Do not use this for:**\n" +
      "• Spam / off-topic\n" +
      "• Repeated requests without new info\n" +
      "• Suggestions (use the suggestions channel)",
  });

  const c3 = card({
    title: "Estimated Response Time",
    body: eta,
  });

  const c4 = card({
    title: "Contact Support",
    body:
      "You’ll pick a reason, then fill a short form:\n" +
      "• Describe your issue\n" +
      "• Steps you tried\n" +
      "• License type (Free / Pro)\n" +
      "• Optional email\n\n" +
      "After you submit, a ticket channel is created for you.",
  });

  const c5 = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c5.addTextDisplayComponents((t) => t.setContent(" "));
  c5.addActionRowComponents((row) =>
    row.setComponents([
      {
        type: 2,
        custom_id: "ticket_start",
        style: 1,
        label: "Contact Support",
        emoji: { id: "1463540942870155327", name: "sent02StrokeRounded" },
      },
    ])
  );

  return [c1, c2, c3, c4, c5];
}

async function updateEtaPanel(client, guild) {
  if (!client.ticketPanelInfo) return;
  const info = client.ticketPanelInfo[guild.id];
  if (!info) return;

  const channel = guild.channels.cache.get(info.channelId) || (await guild.channels.fetch(info.channelId).catch(() => null));
  if (!channel || !channel.isTextBased()) return;

  const msg = await channel.messages.fetch(info.messageId).catch(() => null);
  if (!msg) return;

  const comps = buildTicketPanelComponents(client, guild);
  await msg.edit({ components: comps, flags: MessageFlags.IsComponentsV2 }).catch(() => null);
}

function registerTicketOpen(client, channel) {
  if (!channel || channel.parentId !== CATEGORY_ID) return;
  const guildId = channel.guild.id;
  const container = getContainer(client, guildId);
  container.openTickets[channel.id] = Date.now();
}

async function registerTicketClaim(client, channel) {
  if (!channel || !channel.guild) return;
  const guild = channel.guild;
  const container = getContainer(client, guild.id);

  const openedAt = container.openTickets[channel.id];
  if (!openedAt) return;

  const diffMs = Date.now() - openedAt;
  if (diffMs <= 0) {
    delete container.openTickets[channel.id];
    return;
  }

  const diffMinutes = Math.min(Math.max(diffMs / 60000, 0), 240);
  container.stats.totalResponses += 1;
  container.stats.totalMinutes += diffMinutes;

  delete container.openTickets[channel.id];
  await updateEtaPanel(client, guild).catch(() => null);
}

module.exports = {
  BRAND_BLUE,
  buildTicketPanelComponents,
  formatEtaText,
  updateEtaPanel,
  registerTicketOpen,
  registerTicketClaim,
};
