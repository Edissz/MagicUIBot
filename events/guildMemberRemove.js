const { snapshotMemberRoles } = require('../utils/memberRoleStore');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    if (member.user?.bot) return;

    try {
      const snapshot = snapshotMemberRoles(member);
      console.log(`Saved ${snapshot.roles.length} restorable roles for ${member.user.tag}`);
    } catch (err) {
      console.error(`Failed to save roles for ${member.user?.tag || member.id}:`, err.message);
    }
  }
};
