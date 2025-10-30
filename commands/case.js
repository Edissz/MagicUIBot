const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/caseStore');

module.exports = {
  name: 'cases',
  async execute(message, args) {
    const target = message.mentions.users.first() || (args[0] && await message.client.users.fetch(args[0]).catch(() => null)) || message.author;
    const data = getUser(message.guild.id, target.id);
    const all = data.cases || [];
    const last = all.slice(-5).map(c => `#${c.id} • ${c.type.toUpperCase()} • ${c.reason || 'No reason'}`).join('\n') || 'No cases';
    const embed = new EmbedBuilder()
      .setTitle(`Cases for ${target.tag}`)
      .setDescription(`Total: ${all.length}\n${last}`)
      .setColor('Red');
    await message.reply({ embeds: [embed] });
  }
};
