const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const channelId = '1433152794415595721';

    const buildEmbed = () =>
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
          '**Stay in the loop with Dev News <:5_:1415414561967706122>**\n' +
          '> Get notified for new tools, AI launches, and tech updates — just select <@&1433155194224382094> role option at → <id:customize>'
        );

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return console.log('⚠️ Sticky channel not found.');

    const sendSticky = async () => {
      if (client.stickyMessageId) {
        try {
          const old = await channel.messages.fetch(client.stickyMessageId);
          if (old?.deletable) await old.delete().catch(() => {});
        } catch {}
      }
      const msg = await channel.send({ embeds: [buildEmbed()] });
      client.stickyMessageId = msg.id;
    };

    await sendSticky();
    console.log(`✅ Sticky message active in #${channel.name}`);

    client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      if (message.channel.id !== channelId) return;
      try {
        await sendSticky();
      } catch (err) {
        console.error('❌ Error refreshing sticky:', err);
      }
    });
  },
};

