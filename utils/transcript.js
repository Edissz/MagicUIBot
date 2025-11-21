const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

async function fetchAllMessages(channel) {
  let lastId = null;
  const messages = [];
  for (;;) {
    const fetched = await channel.messages
      .fetch({ limit: 100, before: lastId })
      .catch(() => null);

    if (!fetched || fetched.size === 0) break;

    fetched.forEach((m) => messages.push(m));
    lastId = fetched.last().id;

    if (fetched.size < 100) break;
  }
  return messages.reverse();
}

function parseTopicMetadata(topic) {
  if (!topic) return {};
  const ownerMatch = topic.match(/OWNER:(\d{17,20})/);
  const typeMatch = topic.match(/TYPE:([a-zA-Z0-9_-]+)/);
  const voiceMatch = topic.match(/VOICE:(\d{17,20})/);
  const claimedMatch = topic.match(/CLAIMED_BY:(\d{17,20})/);

  return {
    ownerId: ownerMatch ? ownerMatch[1] : null,
    type: typeMatch ? typeMatch[1] : null,
    voiceChannelId: voiceMatch ? voiceMatch[1] : null,
    claimedById: claimedMatch ? claimedMatch[1] : null
  };
}

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  return `${d.toISOString()} (unix: ${Math.floor(d.getTime() / 1000)})`;
}

function formatMsg(m) {
  const ts = new Date(m.createdTimestamp).toISOString();
  const author = `${m.author.tag} (${m.author.id})`;
  const content = m.content || '';

  const attachments = m.attachments.size
    ? ` [attachments: ${[...m.attachments.values()].map((a) => a.url).join(', ')}]`
    : '';

  let extras = '';

  if (m.reference && m.reference.messageId) {
    extras += ` [reply to: ${m.reference.messageId}]`;
  }

  if (m.embeds && m.embeds.length > 0) {
    extras += ` [embeds: ${m.embeds.length}]`;
  }

  if (m.stickers && m.stickers.size > 0) {
    extras += ` [stickers: ${m.stickers.size}]`;
  }

  return `[${ts}] ${author}: ${content}${attachments}${extras}`;
}

/**
 * Build a rich text transcript with:
 * - Header (guild, channel, owner, type, claimedBy, opened/closed, count)
 * - Full message log
 */
async function saveTranscript(channel) {
  const msgs = await fetchAllMessages(channel);
  const topicMeta = parseTopicMetadata(channel.topic || '');
  const client = channel.client;

  const guild = channel.guild || null;

  let ownerTag = null;
  let claimedByTag = null;

  if (topicMeta.ownerId) {
    try {
      const u = await client.users.fetch(topicMeta.ownerId);
      ownerTag = `${u.tag} (${u.id})`;
    } catch {
      ownerTag = `${topicMeta.ownerId}`;
    }
  }

  if (topicMeta.claimedById) {
    try {
      const u = await client.users.fetch(topicMeta.claimedById);
      claimedByTag = `${u.tag} (${u.id})`;
    } catch {
      claimedByTag = `${topicMeta.claimedById}`;
    }
  }

  const openedAt = msgs.length > 0 ? msgs[0].createdTimestamp : null;
  const closedAt = msgs.length > 0 ? msgs[msgs.length - 1].createdTimestamp : null;

  const headerLines = [];

  headerLines.push('MagicUI Support Ticket Transcript');
  headerLines.push('──────────────────────────────────────────────');

  if (guild) {
    headerLines.push(`Guild: ${guild.name} (${guild.id})`);
  } else {
    headerLines.push('Guild: N/A');
  }

  headerLines.push(`Channel: #${channel.name} (${channel.id})`);

  if (topicMeta.type) {
    headerLines.push(`Ticket Type: ${topicMeta.type}`);
  }

  if (ownerTag) {
    headerLines.push(`Owner: ${ownerTag}`);
  }

  if (claimedByTag) {
    headerLines.push(`Claimed By: ${claimedByTag}`);
  }

  if (topicMeta.voiceChannelId) {
    headerLines.push(`Linked Voice Channel ID: ${topicMeta.voiceChannelId}`);
  }

  headerLines.push(`Opened At: ${formatTimestamp(openedAt)}`);
  headerLines.push(`Closed At: ${formatTimestamp(closedAt)}`);
  headerLines.push(`Message Count: ${msgs.length}`);
  headerLines.push('──────────────────────────────────────────────');
  headerLines.push('');

  const lines = msgs.map(formatMsg);

  return (
    headerLines.join('\n') +
    (lines.length ? lines.join('\n') : 'No messages found in this channel.')
  );
}

/**
 * Optional helper:
 * Send transcript directly to a dedicated transcript log channel.
 * Not used by the rest of the bot by default – you can call it manually if you want.
 *
 * @param {TextChannel} channel - Ticket text channel
 * @param {string} targetChannelId - Transcript log channel ID
 */
async function sendTranscriptToChannel(channel, targetChannelId) {
  const client = channel.client;
  const target = await client.channels.fetch(targetChannelId).catch(() => null);
  if (!target || !target.isTextBased()) return false;

  const content = await saveTranscript(channel);
  const buffer = Buffer.from(content, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, {
    name: `transcript-${channel.id}.txt`
  });

  const guild = channel.guild || null;
  const topicMeta = parseTopicMetadata(channel.topic || '');

  const embedDescParts = [];

  if (guild) {
    embedDescParts.push(`**Guild:** ${guild.name} (${guild.id})`);
  }

  embedDescParts.push(`**Channel:** ${channel.toString()} (${channel.id})`);

  if (topicMeta.type) {
    embedDescParts.push(`**Ticket Type:** \`${topicMeta.type}\``);
  }

  if (topicMeta.ownerId) {
    embedDescParts.push(`**Owner:** <@${topicMeta.ownerId}> (${topicMeta.ownerId})`);
  }

  if (topicMeta.claimedById) {
    embedDescParts.push(`**Claimed By:** <@${topicMeta.claimedById}> (${topicMeta.claimedById})`);
  }

  const embed = new EmbedBuilder()
    .setTitle('📄 Ticket Transcript')
    .setColor(0x2b2d31)
    .setDescription(embedDescParts.join('\n'))
    .setTimestamp();

  await target.send({
    embeds: [embed],
    files: [attachment]
  });

  return true;
}

module.exports = {
  saveTranscript,
  sendTranscriptToChannel
};
