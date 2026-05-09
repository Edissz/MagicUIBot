const { SlashCommandBuilder } = require('discord.js');
const { handleSupportSlashCommand } = require('../utils/supportSystem');

module.exports = {
  name: 'support',
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Open the Magic UI support menu.'),
  async execute(message) {
    return message.reply('Use `/support` to open the Magic UI support menu.');
  },
  async executeSlash(interaction) {
    return handleSupportSlashCommand(interaction);
  }
};
