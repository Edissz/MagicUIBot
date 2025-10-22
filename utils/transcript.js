function formatStamp(d) {
  const dt = new Date(d);
  return isNaN(dt) ? '' : dt.toISOString();
}

async function buildTranscript(channel) {
  const lines = [];
  lines.push(`Transcript for #${channel.name} (${channel.id})`);
  lines.push(`Guild: ${channel.guild?.name} (${channel.guildId})`);
  lines.push(`URL: https://discord.com/channels/${channel.guildId}/${channel.id}`);
  lines.push('='.repeat(64));

  let lastId = undefined;
  let fetchMore = true;
  let rounds = 0;

  while (fetchMore && rounds < 10) {
    const msgs = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!msgs || msgs.size === 0) break;

    msgs.sort((a, b) => a.createdTimestamp - b.createdTimestamp).forEach(m => {
      const time = formatStamp(m.createdTimestamp);
      const author = `${m.author?.tag || m.author?.id || 'Unknown'} (${m.author?.id || ''})`;
      const content = (m.content || '').replace(/\n/g, '\n  ');
      lines.push(`[${time}] ${author}: ${content}`);

      if (m.attachments?.size) {
        m.attachments.forEach(att => {
          lines.push(`  [attachment] ${att.name} -> ${att.url}`);
        });
      }
      if (m.embeds?.length) {
        lines.push(`  [embed] count=${m.embeds.length}`);
      }
    });

    lastId = msgs.first().id;
    fetchMore = msgs.size === 100;
    rounds++;
  }

  return lines.join('\n');
}

module.exports = { buildTranscript };
