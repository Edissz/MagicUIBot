const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    const channelId = '1433152794415595721';
    if (message.author.bot || message.channel.id !== channelId) return;

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(
        '**Stay in the loop with Dev News <:5_:1415414561967706122>**\n' +
        '> Get notified for new tools, AI launches, and tech updates, just select <@&1433155194224382094> role option at →<id:customize>'
      );

    try {
      const channel = message.channel;
      if (client.stickyMessageId) {
        const oldMsg = await channel.messages.fetch(client.stickyMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }

      const newMsg = await channel.send({ embeds: [embed] });
      client.stickyMessageId = newMsg.id;
    } catch (err) {
      console.error('⚠️ Sticky message update failed:', err);
    }
  }
};
