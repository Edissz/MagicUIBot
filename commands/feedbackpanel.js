const {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const FEEDBACK_FORUM_ID = '1426517446440910969'; 
const COLOR = 0x1d55e2;

module.exports = {
  name: 'feedbackpanel',
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild))
      return message.reply('<:cross:1430525603701850165> You lack permission to send the feedback panel.');

  
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Feedback System' })
      .setTitle('Magic UI Feedback Forum')
      .setDescription('We appreciate your input! Share your thoughts to help us improve **Magic UI**.')
      .setFooter({ text: 'Feedback helps shape future updates.' });


    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('feedback_anon')
        .setLabel('Anonymous Feedback')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('feedback_named')
        .setLabel('Named Feedback')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    return message.reply('<:check:1430525546608988203> Feedback panel sent successfully.');
  }
};
