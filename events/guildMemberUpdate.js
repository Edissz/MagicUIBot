const {
  MODERATION_CONFIG,
  SILENT_MENTIONS,
  V2_FLAGS,
  buildRoleLogComponents,
  buildRoleUpdateComponents
} = require('../utils/moderationV2');

function roleList(collection) {
  return collection.map(role => `- ${role.name}`).join('\n') || 'None';
}

module.exports = {
  name: 'guildMemberUpdate',

  async execute(oldMember, newMember) {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    if (!addedRoles.size && !removedRoles.size) return;

    const added = roleList(addedRoles);
    const removed = roleList(removedRoles);

    try {
      await newMember.send({
        components: buildRoleUpdateComponents({ added, removed }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    } catch {
      console.log(`Could not DM ${newMember.user.tag}.`);
    }

    const modlogChannel = newMember.guild.channels.cache.get(MODERATION_CONFIG.modlogChannelId);
    if (modlogChannel) {
      await modlogChannel.send({
        components: buildRoleLogComponents({
          userTag: newMember.user.tag,
          userId: newMember.id,
          added,
          removed
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }
  }
};
