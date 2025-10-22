async function fetchAllMessages(channel) {
  let lastId = null;
  const messages = [];
  for (;;) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!fetched || fetched.size === 0) break;
    fetched.forEach(m => messages.push(m));
    lastId = fetched.last().id;
    if (fetched.size < 100) break;
  }
  return messages.reverse();
}

function formatMsg(m) {
  const ts = new Date(m.createdTimestamp).toISOString();
  const author = `${m.author.tag} (${m.author.id})`;
  const content = m.content || '';
  const attach = m.attachments.size
    ? ` [attachments: ${[...m.attachments.values()].map(a => a.url).join(', ')}]`
    : '';
  return `[${ts}] ${author}: ${content}${attach}`;
}

async function saveTranscript(channel) {
  const msgs = await fetchAllMessages(channel);
  const lines = msgs.map(formatMsg);
  return `Transcript for #${channel.name} (${channel.id})\n` + lines.join('\n');
}

module.exports = { saveTranscript };
