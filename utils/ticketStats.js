const {
  ContainerBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

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
  const data = client.__ticketStats?.[guild.id];
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
      "We haven’t collected enough recent data to calculate this. When staff is online, most tickets are typically claimed within a few minutes."
    );
  }

  const rounded = Math.max(1, Math.round(minutes));
  const unit = rounded === 1 ? "minute" : "minutes";

  if (rounded <= 2) {
    return (
      "<a:48084loadingcircle:1439975825616408656> **Estimated claim time:** Under 2 minutes.\n\n" +
      "Support is currently moving quickly."
    );
  }

  return (
    `<a:48084loadingcircle:1439975825616408656> **Estimated claim time:** ~${rounded} ${unit}.\n\n` +
    "This estimate updates automatically based on recent ticket claim times."
  );
}

function card(title, body) {
  const c = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  const safe = String(body || "\u200B");
  c.addTextDisplayComponents((t) => t.setContent(safe.length ? safe : "\u200B"));
  return c;
}

function buildTicketPanelComponents(client, guild) {
  const c1 = card(
    "MagicUI Support",
    "<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**.\n\n" +
    "Use this system for help with access, billing, technical issues, and general questions.\n" +
    "To begin, click **Contact Support** and follow the prompts."
  );

  const c2 = card(
    "Guidelines",
    "**Appropriate reasons to open a ticket:**\n" +
    "• Payment or billing issues\n" +
    "• Bug reports or broken components\n" +
    "• General support inquiries\n" +
    "• Rule violation reports\n" +
    "• Product / entitlement issues\n\n" +
    "**Please avoid opening tickets for:**\n" +
    "• Spam or off-topic messages\n" +
    "• Repeated requests without new information\n" +
    "• Feature suggestions (use the appropriate suggestion channel)\n\n" +
    "Misuse of the support system may result in moderation action."
  );

  const c3 = card("Estimated Response Time", formatEtaText(client, guild));

  const c4 = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c4.addTextDisplayComponents((t) => t.setContent("**Contact Support**"));
  c4.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  c4.addTextDisplayComponents((t) =>
    t.setContent(
      "When you click **Contact Support**, you will:\n" +
      "• Select a ticket reason\n" +
      "• Provide a clear description of the issue\n" +
      "• Share steps you have already tried\n" +
      "• Confirm your license type (Free/Pro)\n" +
      "• Optionally provide an email address\n\n" +
      "A private ticket channel will be created automatically."
    )
  );
  c4.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  c4.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder().setCustomId("ticket_start").setLabel("Contact Support").setStyle(ButtonStyle.Primary)
    )
  );

  return [c1, c2, c3, c4];
}

async function updateEtaPanel(client, guild) {
  const info = client.ticketPanelInfo?.[guild.id];
  if (!info) return;

  const channel =
    guild.channels.cache.get(info.channelId) ||
    (await guild.channels.fetch(info.channelId).catch(() => null));
  if (!channel || !channel.isTextBased()) return;

  const msg = await channel.messages.fetch(info.messageId).catch(() => null);
  if (!msg) return;

  await msg
    .edit({
      components: buildTicketPanelComponents(client, guild),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    })
    .catch(() => null);
}

function registerTicketOpen(client, channel) {
  if (!channel || channel.parentId !== CATEGORY_ID) return;
  const container = getContainer(client, channel.guild.id);
  container.openTickets[channel.id] = Date.now();
}

async function registerTicketClaim(client, channel) {
  if (!channel?.guild) return;

  const guild = channel.guild;
  const container = getContainer(client, guild.id);

  const openedAt = container.openTickets[channel.id];
  if (!openedAt) return;

  const diffMs = Date.now() - openedAt;
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
