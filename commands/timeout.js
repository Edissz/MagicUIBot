const { PermissionsBitField } = require('discord.js');
const { addCase } = require('../utils/caseStore');
const {
  SILENT_MENTIONS,
  V2_FLAGS,
  buildModerationLogComponents,
  buildTimeoutNoticeComponents
} = require('../utils/supportV2');

module.exports = {
  name: 'timeout',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('<:cross:1430525603701850165> You do not have permission to use this command.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('<:cross:1430525603701850165> Mention a user.');

    const minutes = Number(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'No reason provided.';

    try {
      await target.timeout(minutes * 60 * 1000, reason);
    } catch {
      return message.reply('<:cross:1430525603701850165> Failed to timeout user. I may be missing permissions or role hierarchy.');
    }

    const caseNum = addCase(message.guild.id, target.id, {
      type: 'timeout',
      mod: message.author.id,
      reason,
      minutes
    });
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      await target.send({
        components: buildTimeoutNoticeComponents({
          caseId: caseNum,
          reason,
          moderatorTag: message.author.tag,
          minutes,
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
          action: `Timeout (${minutes}m)`,
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

    return message.reply(`<:check:1430525546608988203> Timed out ${target.user.tag} for ${minutes}m | Case #${caseNum}`);
  }
};
