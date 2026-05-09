const { SILENT_MENTIONS, V2_FLAGS, buildWelcomeComponents } = require('../utils/supportV2');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    await new Promise(res => setTimeout(res, 2000));

    try {
      await member.send({
        components: buildWelcomeComponents(),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
      console.log(`Sent welcome DM to ${member.user.tag}`);
    } catch (err) {
      console.error(`Failed to DM ${member.user.tag}:`, err.message);
    }
  }
};
