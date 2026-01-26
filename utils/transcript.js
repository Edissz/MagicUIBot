const { AttachmentBuilder } = require("discord.js");

async function fetchAllMessages(channel) {
  let lastId = null;
  const messages = [];
  for (; ;) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
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
  const claimedMatch = topic.match(/CLAIMED_BY:(\d{17,20})/);
  return {
    ownerId: ownerMatch ? ownerMatch[1] : null,
    type: typeMatch ? typeMatch[1] : null,
    claimedById: claimedMatch ? claimedMatch[1] : null,
  };
}

function formatMsg(m) {
  const ts = new Date(m.createdTimestamp).toISOString();
  const author = `${m.author.tag} (${m.author.id})`;
  const content = m.content || "";
  const attachments = m.attachments.size ? ` [attachments: ${[...m.attachments.values()].map((a) => a.url).join(", ")}]` : "";
  return `[${ts}] ${author}: ${content}${attachments}`;
}

async function saveTranscript(channel) {
  const msgs = await fetchAllMessages(channel);
  const meta = parseTopicMetadata(channel.topic || "");

  const header = [];
  header.push("MagicUI Support Ticket Transcript");
  header.push("──────────────────────────────────────────────");
  header.push(`Guild: ${channel.guild?.name || "N/A"} (${channel.guild?.id || "N/A"})`);
  header.push(`Channel: #${channel.name} (${channel.id})`);
  if (meta.type) header.push(`Ticket Type: ${meta.type}`);
  if (meta.ownerId) header.push(`Owner: ${meta.ownerId}`);
  if (meta.claimedById) header.push(`Claimed By: ${meta.claimedById}`);
  header.push(`Message Count: ${msgs.length}`);
  header.push("──────────────────────────────────────────────");
  header.push("");

  const lines = msgs.map(formatMsg);
  return header.join("\n") + (lines.length ? lines.join("\n") : "No messages found.");
}

function transcriptAttachment(channelId, content) {
  return new AttachmentBuilder(Buffer.from(content, "utf-8"), { name: `transcript-${channelId}.txt` });
}

module.exports = { saveTranscript, transcriptAttachment };
