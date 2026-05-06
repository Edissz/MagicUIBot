const { isAdminMember, sendAdminHub, sendPublicPanel } = require('../utils/jobBoard');

async function postJobBoardPanel(message) {
  if (!isAdminMember(message.member)) {
    return message.reply('<:cross:1430525603701850165> Only admins can post the job board panel.');
  }

  const publicPanel = await sendPublicPanel(message.guild);
  await sendAdminHub(message.guild, message.author);

  return message.reply(
    `<:check:1430525546608988203> Job board panel posted in ${publicPanel.channel}. Admin controls were refreshed too.`
  );
}

module.exports = {
  name: 'job',
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    if (subcommand !== 'post') {
      return message.reply('Use `.job post` to send the MagicUI job board panel.');
    }

    return postJobBoardPanel(message);
  }
};

