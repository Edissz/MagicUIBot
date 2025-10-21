const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const { addCase } = require('../utils/caseStore');

module.exports = {
  name: 'timeout',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ No permission.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mention a user.');
    const minutes = Number(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'No reason provided';
    try { await target.timeout(minutes * 60 * 1000, reason); } catch { return message.reply('❌ Failed to timeout.'); }
    const caseNum = addCase(message.guild.id, target.id, { type: 'timeout', mod: message.author.id, reason, minutes });
    const embed = new EmbedBuilder()
      .setTitle('Punishment Notice')
      .setDescription(`**<:64363463446:1421844300043387050> Magic UI - You received a punishment from our moderation team.**\n\n> **Punishment**: Timeout (${minutes}m)\n> **Case ID**: #${caseNum}\n> **Reason**: ${reason}\n\nAppeal:\nhttps://discord.com/channels/1151315619246002176/1405208521871724605\nMagic UI Moderation Team.`)
      .setColor('Red');
    const btn = new ButtonBuilder().setLabel('Appeal Here').setURL('https://discord.com/channels/1151315619246002176/1405208521871724605').setStyle(ButtonStyle.Link);
    const row = new ActionRowBuilder().addComponents(btn);
    try { await target.send({ embeds: [embed], components: [row] }); } catch {}
    const log = client.channels.cache.get(client.modlogChannelId);
    if (log) log.send({ embeds: [embed] });
    await message.reply(`✅ Timed out ${target.user.tag} for ${minutes}m | Case #${caseNum}`);
  }
};
