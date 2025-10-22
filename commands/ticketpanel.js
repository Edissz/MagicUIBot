const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');

const PANEL_CHANNEL_ID = '1405208521871724605';

module.exports = {
  name: 'ticketpanel',
  async execute(message) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ Admins only.');
    }

    const channel = message.client.channels.cache.get(PANEL_CHANNEL_ID) || message.channel;
    const royalBlue = 0x5865f2;

    const e1 = new EmbedBuilder()
      .setColor(royalBlue)
      .setTitle('Welcome to MagicUI Support')
      .setDescription(
        '<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**. ' +
        "We're here to assist with anything related to design, code, billing, access, or technical problems. " +
        'Please follow the steps carefully and choose the correct reason to avoid delays.'
      );

    const e2 = new EmbedBuilder()
      .setColor(royalBlue)
      .setTitle('Rules & When to Open a Ticket')
      .setDescription(
        '**Please Read Before Opening a Ticket**\n\n' +
        'Misuse of the ticket system may result in warnings.\n\n' +
        '<:techouse210:1421840914653122631> **Tickets may be opened for:**\n' +
        '- <:techouse212:1421842840899551332> Payment or billing issues\n' +
        '- <:4234234235:1421844306511007784> Bug reports or broken components\n' +
        '- <:34:1421844303474462720> General support inquiries\n' +
        '- <:64363463446:1421844300043387050> Rule violation reports\n' +
        '- <:46346346346:1421844296537083994> Order or product issues\n\n' +
        '**Do not open tickets for:**\n' +
        '- Spam or off-topic questions\n' +
        '- Repeated requests without new information\n' +
        '- Feature suggestions (use <#1237846965342175394> instead)\n' +
        '- You must follow our server rules in order to use this system!'
      );

    const e3 = new EmbedBuilder()
      .setColor(royalBlue)
      .setTitle('Open a Ticket')
      .setDescription(
        'To begin, please select the reason for your ticket from the menu below. ' +
        'Our MagicUI team will handle it based on your selection.'
      )
      .setImage('https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif?ex=68f97669&is=68f824e9&hm=c9993fd79b529977008e75d8ee143cec72d92882aa1208b51b436aa0fbe205fb');

    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_reason')
      .setPlaceholder('Choose a reason')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Payment Issue')
          .setValue('payment')
          .setDescription('Billing, refunds, failed transactions')
          .setEmoji({ id: '1421842840899551332', name: 'techouse212' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Bug Report & Technical support')
          .setValue('bug')
          .setDescription("Something isn't working? Report it")
          .setEmoji({ id: '1421844306511007784', name: '4234234235' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('General Support')
          .setValue('general')
          .setDescription('General questions or help')
          .setEmoji({ id: '1421844303474462720', name: '34' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Rule Violation')
          .setValue('rule')
          .setDescription('Report a user breaking rules')
          .setEmoji({ id: '1421844300043387050', name: '64363463446' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Order / Product Issue')
          .setValue('order')
          .setDescription('Purchase, delivery, product problems')
          .setEmoji({ id: '1421844296537083994', name: '46346346346' }),
      );

    const row = new ActionRowBuilder().addComponents(select);

    await channel.send({ embeds: [e1, e2, e3], components: [row] });
    if (channel.id !== message.channel.id) {
      await message.reply('✅ Ticket panel sent.');
    }
  },
};
