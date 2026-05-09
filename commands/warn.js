const { PermissionsBitField } = require('discord.js');
const { addCase, getUser } = require('../utils/caseStore');
const {
  EMOJI_TEXT,
  MODERATION_CONFIG,
  SILENT_MENTIONS,
  V2_FLAGS,
  buildModerationLogComponents,
  buildModerationNoticeComponents
} = require('../utils/moderationV2');

module.exports = {
  name: 'warn',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply(`${EMOJI_TEXT.cross} You do not have permission to use this command.`);
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply(`${EMOJI_TEXT.cross} Please mention a valid user.`);

    const reason = args.slice(1).join(' ') || 'No reason provided.';
    const caseNum = addCase(message.guild.id, target.id, {
      type: 'warn',
      mod: message.author.id,
      reason
    });

    await target.send({
      components: buildModerationNoticeComponents({ action: 'warn', caseNum, reason }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    }).catch(() => null);

    const log = client.channels.cache.get(MODERATION_CONFIG.modlogChannelId);
    if (log) {
      await log.send({
        components: buildModerationLogComponents({
          action: 'warn',
          userTag: target.user.tag,
          userId: target.id,
          moderatorTag: message.author.tag,
          moderatorId: message.author.id,
          reason,
          caseNum
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    const info = getUser(message.guild.id, target.id);
    const warnCount = info.cases.filter(item => item.type === 'warn').length;
    if (warnCount >= 3) {
      const hours = 6;
      const timeoutReason = 'Auto-timeout: 3 warnings';
      await target.timeout(hours * 60 * 60 * 1000, timeoutReason).catch(() => null);

      await target.send({
        components: buildModerationNoticeComponents({
          action: 'timeout',
          reason: 'Accumulated 3 warnings',
          duration: `${hours}h`
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      }).catch(() => null);

      if (log) {
        await log.send({
          components: buildModerationLogComponents({
            action: 'timeout',
            userTag: target.user.tag,
            userId: target.id,
            moderatorTag: 'Magic UI Automation',
            moderatorId: client.user.id,
            reason: timeoutReason,
            duration: `${hours}h`
          }),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }
    }

    return message.reply(`${EMOJI_TEXT.check} Warned ${target.user.tag} | Case #${caseNum}`);
  }
};
