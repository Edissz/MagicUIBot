const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

const SUGGESTIONS_CHANNEL_ID = "1237846965342175394";

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
      "<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **not available yet**.\n\n" +
      "We haven’t collected enough recent data. When staff is online, most tickets are usually claimed within a few minutes."
    );
  }

  const rounded = Math.max(1, Math.round(minutes));
  const unit = rounded === 1 ? "minute" : "minutes";

  return (
    `<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **around ${rounded} ${unit}**.\n\n` +
    "This number updates automatically based on how long staff takes to claim new tickets."
  );
}

function card(title, body, accent) {
  const c = new ContainerBuilder();
  if (accent) c.setAccentColor(accent);

  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const safe = String(body || "").trim();
  c.addTextDisplayComponents((t) => t.setContent(safe.length ? safe : " "));

  return c;
}

function buildTicketPanelComponents(client, guild) {
  const welcome = card(
    "Welcome to MagicUI Support",
    "🎧 Welcome to the **official Magic UI support**. We’re here to assist with anything related to design, code, billing, access, or technical problems. Please follow the steps carefully and choose the correct reason to avoid delays.",
    0x5865f2
  );

  const rules = card(
    "Rules & When to Open a Ticket",
    "**Please Read Before Opening a Ticket**\n\n" +
    "Misuse of the ticket system may result in warnings.\n\n" +
    "**Tickets may be opened for:**\n" +
    "• 💳 Payment or billing issues\n" +
    "• 🐛 Bug reports or broken components\n" +
    "• ❓ General support inquiries\n" +
    "• 🚩 Rule violation reports\n" +
    "• 📦 Order or product issues\n\n" +
    "**Do not open tickets for:**\n" +
    "• Spam or off-topic questions\n" +
    "• Repeated requests without new information\n" +
    `• Feature suggestions (use <#${SUGGESTIONS_CHANNEL_ID}> instead)\n\n` +
    "You must follow our server rules in order to use this system!",
    0x2b2d31
  );

  const eta = card("Estimated Response Time", formatEtaText(client, guild), 0x2b2d31);

  const open = new ContainerBuilder().setAccentColor(0xed4245);
  open.addTextDisplayComponents((t) => t.setContent("**Open a Ticket**"));
  open.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  open.addTextDisplayComponents((t) =>
    t.setContent(
      "To begin, click **Contact Support**. You’ll select a reason, then fill out a short form.\n\n" +
      "Please include clear details so we can help you faster."
    )
  );
  open.addActionRowComponents((row) =>
    row.setComponents(new ButtonBuilder().setCustomId("ticket_contact").setLabel("Contact Support").setStyle(ButtonStyle.Primary))
  );

  return [welcome, rules, eta, open];
}

async function updateEtaPanel(client, guild) {
  const info = client.ticketPanelInfo?.[guild.id];
  if (!info) return;

  const channel = guild.channels.cache.get(info.channelId) || (await guild.channels.fetch(info.channelId).catch(() => null));
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
  if (!channel?.guild) return;
  const c = getContainer(client, channel.guild.id);
  c.openTickets[channel.id] = Date.now();
}

async function registerTicketClaim(client, channel) {
  if (!channel?.guild) return;
  const guild = channel.guild;
  const c = getContainer(client, guild.id);

  const openedAt = c.openTickets[channel.id];
  if (!openedAt) return;

  const diffMs = Date.now() - openedAt;
  const diffMinutes = Math.min(Math.max(diffMs / 60000, 0), 120);

  c.stats.totalResponses += 1;
  c.stats.totalMinutes += diffMinutes;

  delete c.openTickets[channel.id];

  await updateEtaPanel(client, guild).catch(() => null);
}

module.exports = {
  formatEtaText,
  buildTicketPanelComponents,
  updateEtaPanel,
  registerTicketOpen,
  registerTicketClaim,
};
