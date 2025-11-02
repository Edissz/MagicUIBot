const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    try {
      const channelId = '1433152794415595721';
      await client.channels.fetch(channelId).then(async (channel) => {
        if (!channel) return console.log('⚠️ Sticky channel not found.');

        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setDescription(
            '**Stay in the loop with Dev News <:5_:1415414561967706122>**\n' +
            '> Get notified for new tools, AI launches, and tech updates — just select <@&1433155194224382094> role option at → <id:customize>'
          );

        const msg = await channel.send({ embeds: [embed] });
        client.stickyMessageId = msg.id;

        console.log(`✅ Sticky message active in #${channel.name}`);
      });
    } catch (err) {
      console.error('❌ Error sending sticky message:', err);
    }
  },
};
