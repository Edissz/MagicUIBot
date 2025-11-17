const {
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder
} = require('discord.js');
const { formatEtaText } = require('../utils/ticketStats');

const PANEL_COOLDOWN_MS = 30000;

module.exports = {
  name: 'ticketpanel',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('<:cross:1430525603701850165> You lack permission.');
    }

    if (!client.__panelCooldown) client.__panelCooldown = new Map();
    const last = client.__panelCooldown.get(message.channel.id) || 0;
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      return message.reply('<:cross:1430525603701850165> Please wait before sending another panel.');
    }
    client.__panelCooldown.set(message.channel.id, Date.now());

    const color = 0xffffff;

    const e1 = new EmbedBuilder()
      .setTitle('Welcome to MagicUI Support')
      .setColor(color)
      .setDescription(
        '<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**. We\'re here to assist with anything related to design, code, billing, access, or technical problems. Please follow the steps carefully and choose the correct reason to avoid delays.'
      );

    const etaEmbed = new EmbedBuilder()
      .setTitle('Estimated Response Time')
      .setColor(color)
      .setDescription(formatEtaText(client, message.guild));

    const e2 = new EmbedBuilder()
      .setTitle('Rules & When to Open a Ticket')
      .setColor(color)
      .setDescription(
        '**Please Read Before Opening a Ticket**\n\n' +
        'Misuse of the ticket system may result in warnings.\n\n' +
        '**<:techouse210:1421840914653122631> Tickets may be opened for:**\n' +
        '* <:techouse212:1421842840899551332> Payment or billing issues\n' +
        '* <:techouse213:1421844306511007784> Bug reports or broken components\n' +
        '* <:techouse214:1421844303474462720> General support inquiries\n' +
        '* <:techouse215:1421844300043387050> Rule violation reports\n' +
        '* <:techouse216:1421844296537083994> Order or product issues\n\n' +
        '**Do *not* open tickets for:**\n' +
        '> • Spam or off-topic questions\n' +
        '> • Repeated requests without new information\n' +
        '> • Feature suggestions (use <#1237846965342175394> instead)\n\n' +
        'You must follow our server rules in order to use this system!'
      );

    const e3 = new EmbedBuilder()
      .setTitle('Open a Ticket')
      .setColor(color)
      .setDescription(
        'To begin, please select the reason for your ticket from the menu below. Our MagicUI team will handle it based on your selection.'
      )
      .setImage(
        'https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif?ex=68f97669&is=68f824e9&hm=c9993fd79b529977008e75d8ee143cec72d92882aa1208b51b436aa0fbe205fb'
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_reason_select')
      .setPlaceholder('Choose a reason')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Payment Issue')
          .setDescription('Problems with billing, refunds, or failed transactions.')
          .setValue('billing')
          .setEmoji({ id: '1421842840899551332', name: 'techouse212' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Bug Report & Technical Support')
          .setDescription('Something isn’t working? Report technical issues or glitches.')
          .setValue('bug')
          .setEmoji({ id: '1421844306511007784', name: 'techouse213' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('General Support')
          .setDescription('Need help or have a question not listed above?')
          .setValue('general')
          .setEmoji({ id: '1421844303474462720', name: 'techouse214' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Rule Violation')
          .setDescription('Report a user or component breaking server rules or terms.')
          .setValue('rule')
          .setEmoji({ id: '1421844300043387050', name: 'techouse215' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Order / Product Issue')
          .setDescription('Issue with a purchase, delivery, or product received.')
          .setValue('order')
          .setEmoji({ id: '1421844296537083994', name: 'techouse216' }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Live Voice Meeting With Support')
          .setDescription('Private voice channel with support (camera/screen share allowed).')
          .setValue('voice')
          .setEmoji('🎧')
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const panelMsg = await message.channel.send({
      embeds: [e1, etaEmbed, e2, e3],
      components: [row]
    });

    if (!client.ticketPanelInfo) client.ticketPanelInfo = {};
    client.ticketPanelInfo[message.guild.id] = {
      channelId: panelMsg.channel.id,
      messageId: panelMsg.id
    };

    return message.reply('<:check:1430525546608988203> Ticket panel posted.');
  },
  interactionHandler(client) {
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      if (interaction.customId !== 'ticket_reason_select') return;
      const value = interaction.values[0];
      await interaction.reply({
        content: `✅ You selected **${value}**. Please describe your issue below to continue.`,
        ephemeral: true
      });
    });
  }
};
