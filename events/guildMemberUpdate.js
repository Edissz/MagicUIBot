const {
  SILENT_MENTIONS,
  SUPPORT_MODLOG_ID,
  VERIFIED_ROLE_ID,
  V2_FLAGS,
  buildRoleLogComponents,
  buildRoleUpdateComponents
} = require('../utils/supportV2');
const { snapshotMemberRoles } = require('../utils/memberRoleStore');

const JOIN_ROLE_NOTICE_SUPPRESS_MS = 15 * 60 * 1000;

function isRecentJoin(member, client) {
  const key = `${member.guild.id}:${member.id}`;
  const trackedJoin = client.__recentJoins?.get(key) || 0;
  const joinedAt = member.joinedTimestamp || trackedJoin;
  return Boolean(joinedAt && Date.now() - joinedAt < JOIN_ROLE_NOTICE_SUPPRESS_MS);
}

function isVerificationOnlyChange(addedRoles, removedRoles) {
  const changedRoles = [...addedRoles, ...removedRoles];
  return changedRoles.length > 0 && changedRoles.every(role => role.id === VERIFIED_ROLE_ID);
}

module.exports = {
  name: 'guildMemberUpdate',

  async execute(oldMember, newMember, client) {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

    const addedRoles = [...newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id)).values()];
    const removedRoles = [...oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id)).values()];

    if (!addedRoles.length && !removedRoles.length) return;

    try {
      snapshotMemberRoles(newMember);
    } catch (err) {
      console.error(`Failed to update role snapshot for ${newMember.user.tag}:`, err.message);
    }

    const shouldDmRoleUpdate = !isRecentJoin(newMember, client) && !isVerificationOnlyChange(addedRoles, removedRoles);
    if (shouldDmRoleUpdate) {
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
