const { PermissionsBitField } = require('discord.js');
const {
  EMOJI_TEXT,
  MODERATION_CONFIG,
  SILENT_MENTIONS,
  V2_FLAGS,
  buildModerationLogComponents
} = require('../utils/moderationV2');

module.exports = {
  name: 'unban',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply(`${EMOJI_TEXT.cross} You do not have permission to use this command.`);
    }

    const userId = args[0];
    if (!userId) return message.reply(`${EMOJI_TEXT.cross} Provide a user ID.`);

    let userTag = userId;
    try {
      const user = await message.client.users.fetch(userId).catch(() => null);
      if (user) userTag = user.tag;
      await message.guild.members.unban(userId);
    } catch {
      return message.reply(`${EMOJI_TEXT.cross} Failed to unban this user, or the user is not banned.`);
    }

    const log = client.channels.cache.get(MODERATION_CONFIG.modlogChannelId);
    if (log) {
      await log.send({
        components: buildModerationLogComponents({
          action: 'unban',
          userTag,
          userId,
          moderatorTag: message.author.tag,
          moderatorId: message.author.id,
          reason: args.slice(1).join(' ') || 'No reason provided.'
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    return message.reply(`${EMOJI_TEXT.check} Unbanned ${userId}`);
  }
};
