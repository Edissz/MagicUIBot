const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const { addCase, getUser } = require('../utils/caseStore');

module.exports = {
  name: 'warn',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ You don’t have permission to use this command.');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a valid user.');
    const why = args.slice(1).join(' ') || 'No reason provided.';
    const caseNum = addCase(message.guild.id, target.id, { type: 'warn', mod: message.author.id, reason: why });
    await message.reply(`✅ Warned **${target.user.tag}** | Case #${caseNum}`);
    const dmEmbed = new EmbedBuilder()
      .setTitle('Punishment Notice')
      .setColor('Red')
      .setDescription(
        `**Magic UI - You received a punishment from our moderation team.**\n\n` +
        `*Please review the server rules and the details below:*\n\n` +
        `> **Punishment:** Warn\n` +
        `> **Case ID:** #${caseNum}\n` +
        `> **Reason:** ${why}\n\n` +
        `If you believe this was a mistake, open an appeal:\n` +
        `https://discord.com/channels/1151315619246002176/1405208521871724605\n\n` +
        `Magic UI Moderation Team.`
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Appeal Here').setURL('https://discord.com/channels/1151315619246002176/1405208521871724605').setStyle(ButtonStyle.Link)
    );
    try { await target.send({ embeds: [dmEmbed], components: [row] }); } catch {}
    let log = client.channels.cache.get(client.modlogChannelId);
    if (!log) { try { log = await client.channels.fetch(client.modlogChannelId); } catch {} }
    if (log) {
      const logEmbed = new EmbedBuilder()
        .setTitle('Moderation Log')
        .setColor('Red')
        .setDescription(
          `**Action:** Warn\n` +
          `**User:** ${target.user.tag} (${target.id})\n` +
          `**Moderator:** ${message.author.tag} (${message.author.id})\n` +
          `**Reason:** ${why}\n` +
          `**Case ID:** #${caseNum}\n` +
          `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Magic UI Moderation System' });
      await log.send({ embeds: [logEmbed] });
    }
    const info = getUser(message.guild.id, target.id);
    const warnCount = (info.cases || []).filter(c => c.type === 'warn').length;
    if (warnCount >= 3) {
      const hours = 6;
      await target.timeout(hours * 60 * 60 * 1000, 'Auto-timeout: 3 warns').catch(() => null);
      const autoEmbed = new EmbedBuilder()
        .setTitle('Punishment Notice')
        .setColor('Red')
        .setDescription(
          `**Magic UI - You received a punishment from our moderation team.**\n\n` +
          `> **Punishment:** Timeout (${hours}h)\n` +
          `> **Reason:** Accumulated 3 warns\n\n` +
          `Appeal:\nhttps://discord.com/channels/1151315619246002176/1405208521871724605\n` +
          `Magic UI Moderation Team.`
        );
      try { await target.send({ embeds: [autoEmbed], components: [row] }); } catch {}
      if (!log) { try { log = await client.channels.fetch(client.modlogChannelId); } catch {} }
      if (log) await log.send({ embeds: [autoEmbed] });
    }
  },
};
