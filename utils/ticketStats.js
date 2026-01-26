const { ContainerBuilder, SeparatorSpacingSize, MessageFlags, ButtonBuilder, ButtonStyle } = require("discord.js");

const SUPPORT_PANEL_CHANNEL_ID = "1405208521871724605";
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
      "<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **not available yet**.\n\n" +
      "We haven’t collected enough recent data. When staff is online, most tickets are usually claimed within a few minutes."
    );
  }

  const rounded = Math.max(1, Math.round(minutes));
  const unit = rounded === 1 ? "minute" : "minutes";

  if (rounded <= 2) {
    return (
      `<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **under 2 minutes**.\n\n` +
      "Staff is currently claiming new tickets very quickly."
    );
  }

  if (rounded <= 5) {
    return (
      `<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **around ${rounded} ${unit}**.\n\n` +
      "This is based on recent ticket claims from the support team."
    );
  }

  return (
    `<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **around ${rounded} ${unit}**.\n\n` +
    "This number updates automatically based on how long staff takes to claim new tickets."
  );
}

function buildTicketPanelComponents(client, guild) {
  const welcome = new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent("**Welcome to MagicUI Support**"))
    .addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents((t) =>
      t.setContent(
        "🎧 Welcome to the **official Magic UI support**. We’re here to assist with anything related to design, code, billing, access, or technical problems. Please follow the steps carefully and choose the correct reason to avoid delays."
      )
    );

  const rules = new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent("**Rules & When to Open a Ticket**\n**Please Read Before Opening a Ticket**"))
    .addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents((t) =>
      t.setContent(
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
        "You must follow our server rules in order to use this system!"
      )
    );

  const eta = new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent("**Estimated Response Time**"))
    .addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents((t) => t.setContent(formatEtaText(client, guild)));

  const open = new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent("**Open a Ticket**"))
    .addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents((t) =>
      t.setContent(
        "To begin, click **Contact Support** and select the reason for your ticket. Then fill out the form.\n\n" +
        "Please include clear details so we can help faster."
      )
    )
    .addActionRowComponents((row) =>
      row.setComponents(
        new ButtonBuilder()
          .setCustomId("ticket_contact")
          .setLabel("Contact Support")
          .setStyle(ButtonStyle.Primary)
      )
    );

  return [welcome, rules, eta, open];
}

async function updateEtaPanel(client, guild) {
  if (!client.ticketPanelInfo) return;
  const info = client.ticketPanelInfo[guild.id];
  if (!info) return;

  const channel = guild.channels.cache.get(info.channelId);
  if (!channel || !channel.isTextBased()) return;

  let msg;
  try {
    msg = await channel.messages.fetch(info.messageId);
  } catch {
    return;
  }
  if (!msg) return;

  try {
    await msg.edit({
      components: buildTicketPanelComponents(client, guild),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  } catch { }
}

function registerTicketOpen(client, channel) {
  if (!channel || !channel.guild) return;
  const container = getContainer(client, channel.guild.id);
  container.openTickets[channel.id] = Date.now();
}

async function registerTicketClaim(client, channel) {
  if (!channel || !channel.guild) return;
  const guild = channel.guild;
  const container = getContainer(client, guild.id);

  const openedAt = container.openTickets[channel.id];
  if (!openedAt) return;

  const diffMs = Date.now() - openedAt;
  const diffMinutes = Math.min(Math.max(diffMs / 60000, 0), 120);

  container.stats.totalResponses += 1;
  container.stats.totalMinutes += diffMinutes;

  delete container.openTickets[channel.id];

  await updateEtaPanel(client, guild).catch(() => null);
}

module.exports = {
  getEstimatedMinutes,
  formatEtaText,
  buildTicketPanelComponents,
  updateEtaPanel,
  registerTicketOpen,
  registerTicketClaim,
};
