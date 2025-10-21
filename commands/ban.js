const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const { addCase } = require('../utils/caseStore');

module.exports = {
  name: 'ban',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ No permission.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mention a user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    try { await target.ban({ reason }); } catch { return message.reply('❌ Failed to ban.'); }
    const caseNum = addCase(message.guild.id, target.id, { type: 'ban', mod: message.author.id, reason });
    const embed = new EmbedBuilder()
      .setTitle('Punishment Notice')
      .setDescription(`**<:64363463446:1421844300043387050> Magic UI - You received a punishment from our moderation team.**\n\n*Please review the server rules and the details below:*\n\n> **Punishment**: Ban\n> **Case ID**: #${caseNum}\n> **Reason**: ${reason}\n\nIf you believe this was a mistake, reply with evidence or open an appeal:\nhttps://discord.com/channels/1151315619246002176/1405208521871724605\nMagic UI Moderation Team.`)
      .setColor('Red');
    const btn = new ButtonBuilder().setLabel('Appeal Here').setURL('https://discord.com/channels/1151315619246002176/1405208521871724605').setStyle(ButtonStyle.Link);
    const row = new ActionRowBuilder().addComponents(btn);
    try { await target.user.send({ embeds: [embed], components: [row] }); } catch {}
    const log = client.channels.cache.get(client.modlogChannelId);
    if (log) log.send({ embeds: [embed] });
    await message.reply(`✅ Banned ${target.user.tag} | Case #${caseNum}`);
  }
};
