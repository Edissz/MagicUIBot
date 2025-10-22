const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require('discord.js');

const SUPPORT_CHANNEL_ID = '1405208521871724605';
const BLUE = 0x4169e1;

module.exports = {
  name: 'ticketpanel',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ You don’t have permission to run this.');
    }

    const ch = await client.channels.fetch(SUPPORT_CHANNEL_ID).catch(() => null);
    if (!ch) return message.reply('❌ Couldn’t find the support channel.');

    const e1 = new EmbedBuilder()
      .setTitle('Welcome to MagicUI Support')
      .setDescription('<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**. We\'re here to assist with anything related to design, code, billing, access, or technical problems. Please follow the steps carefully and choose the correct reason to avoid delays.')
      .setColor(BLUE);

    const e2 = new EmbedBuilder()
      .setTitle('Rules & When to Open a Ticket')
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
      )
      .setColor(BLUE);

    const e3 = new EmbedBuilder()
      .setTitle('Open a Ticket')
      .setDescription('To begin, please select the reason for your ticket from the menu below. Our MagicUI team will handle it based on your selection.')
      .setImage('https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif')
      .setColor(BLUE);

    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_reason')
      .setPlaceholder('Select your ticket reason')
      .addOptions([
        { label: 'Payment / Billing', value: 'billing', emoji: '💳' },
        { label: 'Bug Report', value: 'bug', emoji: '🐛' },
        { label: 'General Support', value: 'general', emoji: '💬' },
        { label: 'Rule Violation Report', value: 'report', emoji: '🚨' },
        { label: 'Order / Product Issue', value: 'order', emoji: '📦' },
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    await ch.send({ embeds: [e1, e2, e3], components: [row] });
    message.reply('✅ Ticket panel sent to <#1405208521871724605>.');
  },
};
