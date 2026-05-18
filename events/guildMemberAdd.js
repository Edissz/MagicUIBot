const {
  SILENT_MENTIONS,
  V2_FLAGS,
  buildRoleRestoreOfferComponents,
  buildWelcomeComponents
} = require('../utils/supportV2');
const { getRoleSnapshot } = require('../utils/memberRoleStore');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (!client.__recentJoins) client.__recentJoins = new Map();
    client.__recentJoins.set(`${member.guild.id}:${member.id}`, Date.now());
    setTimeout(() => client.__recentJoins.delete(`${member.guild.id}:${member.id}`), 15 * 60 * 1000);

    await new Promise(res => setTimeout(res, 2000));

    try {
      await member.send({
        components: buildWelcomeComponents(member),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
      console.log(`Sent welcome DM to ${member.user.tag}`);
    } catch (err) {
      console.error(`Failed to DM ${member.user.tag}:`, err.message);
    }

    const snapshot = getRoleSnapshot(member.guild.id, member.id);
    if (!snapshot?.roles?.length) return;

    try {
      await member.send({
        components: buildRoleRestoreOfferComponents({
          guildId: member.guild.id,
          savedAt: snapshot.savedAt,
          roleNames: snapshot.roles.map(role => role.name)
        }),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
      console.log(`Sent role restore offer to ${member.user.tag}`);
    } catch (err) {
      console.error(`Failed to send role restore offer to ${member.user.tag}:`, err.message);
    }
  }
};
