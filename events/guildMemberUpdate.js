const {
  SILENT_MENTIONS,
  SUPPORT_MODLOG_ID,
  V2_FLAGS,
  buildRoleLogComponents,
  buildRoleUpdateComponents
} = require('../utils/supportV2');
const { snapshotMemberRoles } = require('../utils/memberRoleStore');

module.exports = {
  name: 'guildMemberUpdate',

  async execute(oldMember, newMember) {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

    const addedRoles = [...newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id)).values()];
    const removedRoles = [...oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id)).values()];

    if (!addedRoles.length && !removedRoles.length) return;

    try {
      snapshotMemberRoles(newMember);
    } catch (err) {
      console.error(`Failed to update role snapshot for ${newMember.user.tag}:`, err.message);
    }

    try {
      await newMember.send({
        components: buildRoleUpdateComponents({
          addedRoles,
          removedRoles,
          guildName: newMember.guild.name
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    } catch {
      console.log(`Could not DM role update to ${newMember.user.tag}.`);
    }

    const modlogChannel = newMember.guild.channels.cache.get(SUPPORT_MODLOG_ID);
    if (modlogChannel) {
      await modlogChannel.send({
        components: buildRoleLogComponents({
          member: newMember,
          addedRoles,
          removedRoles
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }
  }
};
