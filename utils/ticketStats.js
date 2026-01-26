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
      "We haven’t collected enough data. When staff is online, claims are usually quick."
    );
  }

  const rounded = Math.max(1, Math.round(minutes));
  const unit = rounded === 1 ? "minute" : "minutes";

  return (
    `<a:48084loadingcircle:1439975825616408656> **Estimated claim time:** ~${rounded} ${unit}\n\n` +
    "This updates automatically based on recent claims."
  );
}

function card(title, body) {
  const c = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  const safe = String(body || " ").trim();
  c.addTextDisplayComponents((t) => t.setContent(safe.length ? safe : " "));
  return c;
}

function buildTicketPanelComponents(client, guild) {
  const c1 = card(
    "Welcome to MagicUI Support",
    "<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**.\nWe help with access, billing, bugs, setup, and general questions.\n\nClick **Contact Support** to start your request."
  );

  const c2 = card(
    "Guidelines - When to Contact Support",
    "**Use this for:**\n" +
    "- Payment or billing issues\n" +
    "- Bug reports / broken components\n" +
    "- General support\n" +
    "- Rule violation reports\n" +
    "- Order or product issues\n\n" +
    "**Do not use this for:**\n" +
    "- Spam / off-topic\n" +
    "- Repeated requests without new info\n" +
    "- Suggestions (use the suggestions channel)"
  );

  const c3 = card("Estimated Response Time", formatEtaText(client, guild));

  const c4 = card(
    "Contact Support",
    "You’ll pick a reason, then fill a short form:\n" +
    "- Describe your issue\n" +
    "- Steps you tried\n" +
    "- License type (Free / Pro)\n" +
    "- Optional email\n\n" +
    "After you submit, a ticket channel is created for you."
  );

  const c5 = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c5.addTextDisplayComponents((t) => t.setContent(" "));
  c5.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder()
        .setCustomId("ticket_start")
        .setLabel("Contact Support")
        .setStyle(ButtonStyle.Primary)
        .setEmoji({ id: "1463540942870155327", name: "sent02StrokeRounded" })
    )
  );

  return [c1, c2, c3, c4, c5];
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
