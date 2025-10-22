const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

const FEEDBACK_FORUM_ID = '1426517448353517671'; 
const COLOR = 0x1d55e2;

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton() && (interaction.customId === 'feedback_anon' || interaction.customId === 'feedback_named')) {
      const modal = new ModalBuilder()
        .setCustomId(`feedback_modal_${interaction.customId}`)
        .setTitle('MagicUI Feedback Form');

      const feedbackInput = new TextInputBuilder()
        .setCustomId('feedback_text')
        .setLabel('How can we improve MagicUI?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const detailsInput = new TextInputBuilder()
        .setCustomId('feedback_details')
        .setLabel('Additional notes or details (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(feedbackInput),
        new ActionRowBuilder().addComponents(detailsInput)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('feedback_modal_')) {
      const feedback = interaction.fields.getTextInputValue('feedback_text');
      const details = interaction.fields.getTextInputValue('feedback_details') || 'None';
      const anon = interaction.customId.includes('anon');

      const forum = interaction.guild.channels.cache.get(FEEDBACK_FORUM_ID);
      if (!forum) {
        console.error('❌ Feedback forum not found.');
        return interaction.reply({ content: '❌ Could not find the feedback forum channel.', ephemeral: true });
      }

      try {
        const thread = await forum.threads.create({
          name: `Feedback • ${anon ? 'Anonymous' : interaction.user.username}`,
          message: {
            embeds: [
              new EmbedBuilder()
                .setColor(COLOR)
                .setTitle('💬 New Feedback Received')
                .setDescription(
                  `**Feedback:** ${feedback}\n\n**Additional Notes:** ${details}\n\n` +
                  `**Submitted by:** ${anon ? 'Anonymous User 🕵️' : `<@${interaction.user.id}>`}`
                )
                .setTimestamp()
                .setFooter({ text: 'MagicUI Feedback System' })
            ]
          },
          type: ChannelType.PublicThread
        });

        await interaction.reply({
          content: '<:check:1430525546608988203> Feedback submitted successfully!',
          ephemeral: true
        });

        if (!anon) {
          try {
            await interaction.user.send(
              '💌 Thank you for your feedback! This helps us improve **MagicUI**.\nYou won’t receive a direct response, but your feedback has been logged successfully.'
            );
          } catch (err) {
            console.warn('⚠️ Could not DM user feedback confirmation.');
          }
        }
      } catch (err) {
        console.error('❌ Failed to create feedback thread:', err);
        return interaction.reply({
          content: '<:cross:1430525603701850165> There was an error creating your feedback post. Please try again later.',
          ephemeral: true
        });
      }
    }
  }
};
