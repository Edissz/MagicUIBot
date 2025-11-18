const { EmbedBuilder } = require('discord.js');

const CATEGORY_ID = '1405640921017745419';
const STAFF_ROLE_NAMES = ['Moderator', 'Administrator', 'Manager'];

function getContainer(client, guildId) {
  if (!client.__ticketStats) client.__ticketStats = {};
  if (!client.__ticketStats[guildId]) {
    client.__ticketStats[guildId] = {
      stats: { totalResponses: 0, totalMinutes: 0 },
      trackers: {},          // legacy (no longer used, kept so nothing breaks)
      openTickets: {}        // channelId -> openedAt timestamp
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
      '<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **not available yet**.\n\n' +
      'We haven\'t collected enough recent data. When staff is online, most tickets are usually claimed within a few minutes.'
    );
  }

  const rounded = Math.max(1, Math.round(minutes));
  const unit = rounded === 1 ? 'minute' : 'minutes';

  if (rounded <= 2) {
    return (
      `<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **under 2 minutes**.\n\n` +
      'Staff is currently claiming new tickets very quickly.'
    );
  }

  if (rounded <= 5) {
    return (
      `<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **around ${rounded} ${unit}**.\n\n` +
      'This is based on recent ticket claims from the support team.'
    );
  }

  return (
    `<a:48084loadingcircle:1439975825616408656> Our current estimated claim time is **around ${rounded} ${unit}**.\n\n` +
    'This number updates automatically based on how long staff takes to claim new tickets.'
  );
}

async function updateEtaPanel(client, guild) {
  if (!client.ticketPanelInfo) return;
  const info = client.ticketPanelInfo[guild.id];
  if (!info) return;

  const channel = guild.channels.cache.get(info.channelId);
  if (!channel) return;

  let msg;
  try {
    msg = await channel.messages.fetch(info.messageId);
  } catch {
    return;
  }
  if (!msg || !msg.embeds || msg.embeds.length === 0) return;

  const embeds = msg.embeds.map((e) => EmbedBuilder.from(e));
  if (embeds.length < 3) return; // we know e1, e2, etaEmbed, e3 => eta is index 2

  const etaDescription = formatEtaText(client, guild);
  // In your panel: [e1, e2, etaEmbed, e3] → eta is index 2
  embeds[2].setDescription(etaDescription);

  try {
    await msg.edit({ embeds });
  } catch {}
}

/**
 * Register that a ticket was just opened (text channel).
 * Called when the ticket text channel is created.
 */
function registerTicketOpen(client, channel) {
  if (!channel || channel.parentId !== CATEGORY_ID) return;
  const guildId = channel.guild.id;
  const container = getContainer(client, guildId);
  container.openTickets[channel.id] = Date.now();
}

/**
 * Register that a ticket has been claimed.
 * This is what feeds our ETA stats now.
 */
async function registerTicketClaim(client, channel) {
  if (!channel || !channel.guild) return;
  const guild = channel.guild;
  const guildId = guild.id;
  const container = getContainer(client, guildId);

  if (!container.openTickets) container.openTickets = {};
  const openedAt = container.openTickets[channel.id];
  if (!openedAt) return;

  const diffMs = Date.now() - openedAt;
  if (diffMs <= 0) {
    delete container.openTickets[channel.id];
    return;
  }

  const diffMinutes = Math.min(Math.max(diffMs / 60000, 0), 120);
  container.stats.totalResponses += 1;
  container.stats.totalMinutes += diffMinutes;

  delete container.openTickets[channel.id];

  try {
    await updateEtaPanel(client, guild);
  } catch {}
}

/**
 * Legacy: message-based tracking (no longer used).
 * Kept as a no-op so any old imports won’t break.
 */
async function handleTicketMessage(message, client) {
  return;
}

module.exports = {
  handleTicketMessage,
  getEstimatedMinutes,
  formatEtaText,
  updateEtaPanel,
  registerTicketOpen,
  registerTicketClaim
};
