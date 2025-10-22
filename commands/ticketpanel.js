const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require('discord.js');

const PANEL_CHANNEL_ID = '1405208521871724605';
const ROYAL_BLUE = 0x4169e1;

module.exports = {
  name: 'ticketpanel',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ You lack permission to use this.');
    }

    const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return message.reply('❌ Support channel not found or not text-capable.');
    }

    const e1 = new EmbedBuilder()
      .setTitle('Welcome to MagicUI Support')
      .setColor(ROYAL_BLUE)
      .setDescription(
        '<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**. We\'re here to assist with anything related to design, code, billing, access, or technical problems. Please follow the steps carefully and choose the correct reason to avoid delays.'
      );

    const e2 = new EmbedBuilder()
      .setTitle('Rules & When to Open a Ticket')
      .setColor(ROYAL_BLUE)
      .setDescription(
        '**Please Read Before Opening a Ticket**\n\n' +
        'Misuse of the ticket system may result in warnings.\n\n' +
        '<:techouse210:1421840914653122631> Tickets may be opened for:\n' +
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
      .setTitle('Open a Ticket')
      .setColor(ROYAL_BLUE)
      .setDescription('To begin, please select the reason for your ticket from the menu below. Our MagicUI team will handle it based on your selection.')
      .setImage('https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif?ex=68f97669&is=68f824e9&hm=c9993fd79b529977008e75d8ee143cec72d92882aa1208b51b436aa0fbe205fb');

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_reason_select')
      .setPlaceholder('Select your ticket reason')
      .addOptions(
        {
          label: 'Payment / Billing',
          value: 'billing',
          description: 'Issues with payments, invoices, or subscriptions',
          emoji: { id: '1421842840899551332', name: 'techouse212' },
        },
        {
          label: 'Bug Report',
          value: 'bug',
          description: 'Broken component or unexpected behavior',
          emoji: { id: '1421844306511007784', name: '4234234235' },
        },
        {
          label: 'General Support',
          value: 'general',
          description: 'Questions about usage, setup, or guidance',
          emoji: { id: '1421844303474462720', name: '34' },
        },
        {
          label: 'Rule Violation Report',
          value: 'report',
          description: 'Report a user or rule violation',
          emoji: { id: '1421844300043387050', name: '64363463446' },
        },
        {
          label: 'Order / Product Issue',
          value: 'order',
          description: 'Access, delivery, or product-related problems',
          emoji: { id: '1421844296537083994', name: '46346346346' },
        }
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await channel.send({ embeds: [e1, e2, e3], components: [row] });
    if (message.channel.id !== channel.id) {
      await message.reply('✅ Posted the support panel in <#1405208521871724605>.');
    }
  },
};
