const { getUser } = require('../utils/caseStore');
const { SILENT_MENTIONS, V2_FLAGS, buildCasesComponents } = require('../utils/moderationV2');

module.exports = {
  name: 'cases',
  async execute(message, args) {
    const target =
      message.mentions.users.first() ||
      (args[0] && await message.client.users.fetch(args[0]).catch(() => null)) ||
      message.author;
    const data = getUser(message.guild.id, target.id);
    const last = data.cases
      .slice(-5)
      .map(item => `#${item.id} - ${String(item.type || 'case').toUpperCase()} - ${item.reason || 'No reason'}`)
      .join('\n');

    return message.reply({
      components: buildCasesComponents({
        targetTag: target.tag,
        total: data.count,
        lastCases: last
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }
};
