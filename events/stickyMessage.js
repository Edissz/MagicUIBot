const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const channelId = '1433152794415595721';
    if (message.channel.id !== channelId || message.author.bot) return;

    const stickyText =
      '**Stay in the loop with Dev News <:5_:1415414561967706122>**\n' +
      '> Get notified for new tools, AI launches, and tech updates — just select <@&1433155194224382094> role option at → <id:customize>';

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(stickyText);

    try {
      if (message.client.stickyMessage && message.client.stickyMessage.deletable) {
        await message.client.stickyMessage.delete().catch(() => {});
      }

      const newSticky = await message.channel.send({ embeds: [embed] });
      message.client.stickyMessage = newSticky;
    } catch (err) {
      console.error('❌ Error handling sticky message:', err);
    }
  },
};
