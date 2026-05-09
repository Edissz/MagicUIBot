const { buildWelcomeComponents, SILENT_MENTIONS, V2_FLAGS } = require('../utils/moderationV2');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await member.send({
        components: buildWelcomeComponents(member),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
      console.log(`Sent V2 welcome DM to ${member.user.tag}`);
    } catch (err) {
      console.error(`Failed to DM ${member.user.tag}:`, err.message);
    }
  }
};
