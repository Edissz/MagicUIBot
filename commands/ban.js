const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const { addCase } = require('../utils/caseStore');

module.exports = {
  name: 'ban',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply('❌ You don’t have permission to use this command.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a valid user.');
    const reason = args.slice(1).join(' ') || 'No reason provided.';
    const caseNum = addCase(message.guild.id, target.id, { type: 'ban', mod: message.author.id, reason });
    const dmEmbed = new EmbedBuilder()
      .setTitle('Punishment Notice')
      .setColor('Red')
      .setDescription(
        `**Magic UI - You received a punishment from our moderation team.**\n\n` +
        `*Please review the server rules and the details below:*\n\n` +
        `> **Punishment:** Ban\n` +
        `> **Case ID:** #${caseNum}\n` +
        `> **Reason:** ${reason}\n\n` +
        `If you believe this was a mistake, open an appeal:\n` +
        `https://discord.com/channels/1151315619246002176/1405208521871724605\n\n` +
        `Magic UI Moderation Team.`
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Appeal Here').setURL('https://discord.com/channels/1151315619246002176/1405208521871724605').setStyle(ButtonStyle.Link)
    );
    try { await target.send({ embeds: [dmEmbed], components: [row] }); } catch {}
    try { await target.ban({ reason }); } catch { return message.reply('❌ Failed to ban user. Possibly missing permissions.'); }
    let log = client.channels.cache.get(client.modlogChannelId);
    if (!log) { try { log = await client.channels.fetch(client.modlogChannelId); } catch {} }
    if (log) {
      const logEmbed = new EmbedBuilder()
        .setTitle('Moderation Log')
        .setColor('Red')
        .setDescription(
          `**Action:** Ban\n` +
          `**User:** ${target.user.tag} (${target.id})\n` +
          `**Moderator:** ${message.author.tag} (${message.author.id})\n` +
          `**Reason:** ${reason}\n` +
          `**Case ID:** #${caseNum}\n` +
          `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Magic UI Moderation System' });
      await log.send({ embeds: [logEmbed] });
    }
    await message.reply(`✅ Banned ${target.user.tag} | Case #${caseNum}`);
  }
};
