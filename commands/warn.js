const { PermissionsBitField } = require('discord.js');
const { addCase, getUser } = require('../utils/caseStore');
const {
  SILENT_MENTIONS,
  V2_FLAGS,
  buildModerationLogComponents,
  buildTimeoutNoticeComponents,
  buildWarningNoticeComponents
} = require('../utils/supportV2');

module.exports = {
  name: 'warn',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('<:cross:1430525603701850165> You do not have permission to use this command.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('<:cross:1430525603701850165> Please mention a valid user.');

    const reason = args.slice(1).join(' ') || 'No reason provided.';
    const caseNum = addCase(message.guild.id, target.id, {
      type: 'warn',
      mod: message.author.id,
      reason
    });
    const timestamp = Math.floor(Date.now() / 1000);

    await message.reply(`<:check:1430525546608988203> Warned **${target.user.tag}** | Case #${caseNum}`);

    try {
      await target.send({
        components: buildWarningNoticeComponents({
          caseId: caseNum,
          reason,
          moderatorTag: message.author.tag,
          timestamp
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    } catch {}

    const log = client.channels.cache.get(client.modlogChannelId);
    if (log) {
      await log.send({
        components: buildModerationLogComponents({
          action: 'Warning',
          member: target,
          moderator: message.author,
          reason,
          caseId: caseNum,
          color: 0xfaa61a
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    const info = getUser(message.guild.id, target.id);
    const warnCount = info.cases.filter(c => c.type === 'warn').length;
    if (warnCount >= 3) {
      const hours = 6;
      const timeoutReason = 'Auto-timeout: 3 warnings';
      await target.timeout(hours * 60 * 60 * 1000, timeoutReason).catch(() => null);

      try {
        await target.send({
          components: buildTimeoutNoticeComponents({
            caseId: caseNum,
            reason: timeoutReason,
            moderatorTag: 'Magic UI Auto Moderation',
            minutes: hours * 60,
            timestamp: Math.floor(Date.now() / 1000)
          }),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      } catch {}

      if (log) {
        await log.send({
          components: buildModerationLogComponents({
            action: `Auto Timeout (${hours}h)`,
            member: target,
            moderator: client.user,
            reason: timeoutReason,
            caseId: caseNum,
            color: 0xfaa61a
          }),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }
    }
  }
};
