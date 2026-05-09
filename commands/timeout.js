const { PermissionsBitField } = require('discord.js');
const { addCase } = require('../utils/caseStore');
const {
  EMOJI_TEXT,
  MODERATION_CONFIG,
  SILENT_MENTIONS,
  V2_FLAGS,
  buildModerationLogComponents,
  buildModerationNoticeComponents
} = require('../utils/moderationV2');

module.exports = {
  name: 'timeout',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply(`${EMOJI_TEXT.cross} You do not have permission to use this command.`);
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply(`${EMOJI_TEXT.cross} Please mention a valid user.`);

    const minutes = Number(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'No reason provided.';

    try {
      await target.timeout(minutes * 60 * 1000, reason);
    } catch {
      return message.reply(`${EMOJI_TEXT.cross} Failed to timeout user. I may be missing permissions.`);
    }

    const caseNum = addCase(message.guild.id, target.id, {
      type: 'timeout',
      mod: message.author.id,
      reason,
      minutes
    });

    await target.send({
      components: buildModerationNoticeComponents({
        action: 'timeout',
        caseNum,
        reason,
        duration: `${minutes}m`
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    }).catch(() => null);

    const log = client.channels.cache.get(MODERATION_CONFIG.modlogChannelId);
    if (log) {
      await log.send({
        components: buildModerationLogComponents({
          action: 'timeout',
          userTag: target.user.tag,
          userId: target.id,
          moderatorTag: message.author.tag,
          moderatorId: message.author.id,
          reason,
          caseNum,
          duration: `${minutes}m`
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    return message.reply(`${EMOJI_TEXT.check} Timed out ${target.user.tag} for ${minutes}m | Case #${caseNum}`);
  }
};
