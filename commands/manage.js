const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'manage',
  data: new SlashCommandBuilder()
    .setName('manage')
    .setDescription('Manage your Magic UI job board posts in DMs.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('jobs')
        .setDescription('DM controls for your job and for-hire posts.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('templates')
        .setDescription('DM controls for your creator marketplace templates.')),
  async execute(message) {
    return message.reply('Use `/manage jobs` or `/manage templates` to manage your posts privately.');
  }
};
