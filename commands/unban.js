const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'unban',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ No permission.');
    const userId = args[0];
    if (!userId) return message.reply('❌ Provide a user ID.');
    try { await message.guild.members.unban(userId); }
    catch { return message.reply('❌ Failed to unban or user is not banned.'); }
    await message.reply(`✅ Unbanned ${userId}`);
  }
};
