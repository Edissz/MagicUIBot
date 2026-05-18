const { PermissionsBitField } = require('discord.js');
const { addCase } = require('../utils/caseStore');
const {
  SILENT_MENTIONS,
  V2_FLAGS,
  buildBanNoticeComponents,
  buildModerationLogComponents
} = require('../utils/supportV2');

module.exports = {
  name: 'ban',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('<:cross:1430525603701850165> You do not have permission to use this command.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('<:cross:1430525603701850165> Please mention a valid user.');

    const reason = args.slice(1).join(' ') || 'No reason provided.';
    const caseNum = addCase(message.guild.id, target.id, {
      type: 'ban',
      mod: message.author.id,
      reason
    });
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      await target.send({
        components: buildBanNoticeComponents({
          caseId: caseNum,
          reason,
          moderatorTag: message.author.tag,
          timestamp
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    } catch {}

    try {
      await target.ban({ reason });
    } catch {
      return message.reply('<:cross:1430525603701850165> Failed to ban user. I may be missing permissions or role hierarchy.');
    }

    const log = client.channels.cache.get(client.modlogChannelId);
    if (log) {
      await log.send({
        components: buildModerationLogComponents({
          action: 'Ban',
          member: target,
          moderator: message.author,
          reason,
          caseId: caseNum,
          color: 0xef4444
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    return message.reply(`<:check:1430525546608988203> Banned ${target.user.tag} | Case #${caseNum}`);
  }
};
