const { PermissionsBitField } = require('discord.js');
const {
  EMOJI_TEXT,
  MODERATION_CONFIG,
  SILENT_MENTIONS,
  V2_FLAGS,
  buildSystemDmComponents,
  buildSystemDmLogComponents
} = require('../utils/moderationV2');

module.exports = {
  name: 'dm',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply(`${EMOJI_TEXT.cross} You do not have permission to use this command.`);
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply(`${EMOJI_TEXT.cross} Please mention a user to DM.`);

    const body = args.slice(1).join(' ');
    const attachments = Array.from(message.attachments.values());
    if (!body && attachments.length === 0) {
      return message.reply(`${EMOJI_TEXT.cross} Please provide a message or attach a file.`);
    }

    try {
      await target.send({
        components: buildSystemDmComponents({
          moderatorTag: message.author.tag,
          message: body,
          attachments
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    } catch {
      return message.reply(`${EMOJI_TEXT.cross} Could not send DM. The user may have DMs disabled.`);
    }

    const log = client.channels.cache.get(MODERATION_CONFIG.modlogChannelId);
    if (log) {
      await log.send({
        components: buildSystemDmLogComponents({
          moderatorTag: message.author.tag,
          moderatorId: message.author.id,
          userTag: target.user.tag,
          userId: target.id,
          message: body
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    return message.reply(`${EMOJI_TEXT.check} Sent a V2 staff DM to ${target.user.tag}.`);
  }
};
