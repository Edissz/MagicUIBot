const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'support',
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Open the Magic UI support menu.'),
  async execute(message) {
    return message.reply('Use `/support` to open the Magic UI support menu.');
  }
};
