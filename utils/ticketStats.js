const { EmbedBuilder, ChannelType } = require('discord.js');

const CATEGORY_ID = '1405640921017745419';
const STAFF_ROLE_NAMES = ['Moderator', 'Administrator', 'Manager'];

function isTicketTextChannel(channel) {
  return channel.type === ChannelType.GuildText && channel.parentId === CATEGORY_ID;
}

function isStaff(member) {
  if (!member) return false;
  return member.roles.cache.some((r) => STAFF_ROLE_NAMES.includes(r.name));
}

function getContainer(client, guildId) {
  if (!client.__ticketStats) client.__ticketStats = {};
  if (!client.__ticketStats[guildId]) {
    client.__ticketStats[guildId] = {
      stats: { totalResponses: 0, totalMinutes: 0 },
      trackers: {}
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
      '<a:48084loadingcircle:1439975825616408656> Our current estimated first response time is **not available yet**.\n\n' +
      'We haven\'t collected enough recent data. When staff is online, most tickets are usually answered within a few minutes.'
    );
  }

  const rounded = Math.max(1, Math.round(minutes));
  const unit = rounded === 1 ? 'minute' : 'minutes';

  if (rounded <= 2) {
    return (
      `<a:48084loadingcircle:1439975825616408656> Our current estimated first response time is **under 2 minutes**.\n\n` +
      'Staff is currently responding very quickly to tickets.'
    );
  }

  if (rounded <= 5) {
    return (
      `<a:48084loadingcircle:1439975825616408656> Our current estimated first response time is **around ${rounded} ${unit}**.\n\n` +
      'This is based on recent staff replies inside support tickets.'
    );
  }

  return (
    `<a:48084loadingcircle:1439975825616408656> Our current estimated first response time is **around ${rounded} ${unit}**.\n\n` +
    'This number updates automatically based on how long staff takes to reply in tickets.'
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
  if (embeds.length < 2) return;

  const etaDescription = formatEtaText(client, guild);
  embeds[1].setDescription(etaDescription);

  try {
    await msg.edit({ embeds });
  } catch {}
}

async function handleTicketMessage(message, client) {
  if (!isTicketTextChannel(message.channel)) return;

  const guildId = message.guild.id;
  const container = getContainer(client, guildId);
  const trackers = container.trackers;
  const stats = container.stats;

  if (isStaff(message.member)) {
    const tracker = trackers[message.channel.id];
    if (tracker && tracker.waitingSince) {
      const diffMs = Date.now() - tracker.waitingSince;
      if (diffMs > 0) {
        const diffMinutes = Math.min(Math.max(diffMs / 60000, 0), 120);
        stats.totalResponses += 1;
        stats.totalMinutes += diffMinutes;
        tracker.waitingSince = null;
        try {
          await updateEtaPanel(client, message.guild);
        } catch {}
      }
    }
  } else {
    let tracker = trackers[message.channel.id];
    if (!tracker) {
      tracker = { waitingSince: null };
      trackers[message.channel.id] = tracker;
    }
    if (!tracker.waitingSince) {
      tracker.waitingSince = Date.now();
    }
  }
}

module.exports = {
  handleTicketMessage,
  getEstimatedMinutes,
  formatEtaText,
  updateEtaPanel
};
