const { isAdminMember, sendAdminHub, sendPublicPanel } = require('../utils/jobBoard');

module.exports = {
  name: 'jobpost',
  async execute(message) {
    if (!isAdminMember(message.member)) {
      return message.reply('<:cross:1430525603701850165> Only admins can post the job board panel.');
    }

    const publicPanel = await sendPublicPanel(message.guild);
    await sendAdminHub(message.guild, message.author);

    return message.reply(
      `<:check:1430525546608988203> Job board panel posted in ${publicPanel.channel}. Admin controls were refreshed too.`
    );
  }
};
