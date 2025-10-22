const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { buildTranscript } = require('../utils/transcript');

const TICKET_CATEGORY_ID = '1405640921017745419';
const MODLOGS_CHANNEL_ID = '1355260778965373000';
const STAFF_ROLE_A = '1405207645618700349';
const STAFF_ROLE_B = '1324536259439362089';
const BLUE = 0x4169e1;

function staffPing(userId) {
  return `<@&${STAFF_ROLE_A}> <@&${STAFF_ROLE_B}> | <@${userId}>`;
}

function managementRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_hold').setLabel('Hold').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger),
  );
}

function closeConfirmRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // ----- DROPDOWN -> SHOW MODAL -----
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_reason') {
        const reason = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${reason}`)
          .setTitle('MagicUI Support Ticket');

        const issue = new TextInputBuilder()
          .setCustomId('issue')
          .setLabel('Describe your issue')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const steps = new TextInputBuilder()
          .setCustomId('steps')
          .setLabel('What have you tried so far?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        const notes = new TextInputBuilder()
          .setCustomId('notes')
          .setLabel('Additional notes (optional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(issue),
          new ActionRowBuilder().addComponents(steps),
          new ActionRowBuilder().addComponents(notes)
        );

        return interaction.showModal(modal);
      }

      // ----- MODAL SUBMIT -> CREATE TICKET CHANNEL -----
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        const reason = interaction.customId.replace('ticket_modal_', '');
        const issue = interaction.fields.getTextInputValue('issue');
        const steps = interaction.fields.getTextInputValue('steps');
        const notes = interaction.fields.getTextInputValue('notes');

        const guild = interaction.guild;
        const category = guild.channels.cache.get(TICKET_CATEGORY_ID) || null;
        const modlog = guild.channels.cache.get(MODLOGS_CHANNEL_ID) || null;

        const ticketChannel = await guild.channels.create({
          name: `ticket-${interaction.user.username}`.slice(0, 95),
          type: ChannelType.GuildText,
          parent: category?.id,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
            { id: STAFF_ROLE_A, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageThreads, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
            { id: STAFF_ROLE_B, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageThreads, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
          ],
        });

        const ticketIntro = new EmbedBuilder()
          .setTitle('🎫 New Support Ticket')
          .setColor(BLUE)
          .setDescription(
            `**User:** ${interaction.user}\n` +
            `**Reason:** ${reason}\n\n` +
            `**Issue:**\n${issue}\n\n` +
            `**Steps Tried:**\n${steps || 'N/A'}\n\n` +
            `**Notes:**\n${notes || 'None'}`
          )
          .setTimestamp();

        await ticketChannel.send({
          content: staffPing(interaction.user.id),
          embeds: [ticketIntro],
          components: [managementRow()],
        });

        // Create a private staff thread and add the executor (later the claimer) when claimed
        const staffThread = await ticketChannel.threads.create({
          name: `staff-${interaction.user.username}`.slice(0, 95),
          type: ChannelType.PrivateThread,
          invitable: false,
          reason: 'Staff-only discussion for this ticket',
        }).catch(() => null);

        if (staffThread) {
          await staffThread.send({ content: 'Staff-only thread created for this ticket.' }).catch(() => {});
        }

        // DM user with link
        try {
          await interaction.user.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🪄 Ticket Created')
                .setColor(BLUE)
                .setDescription(
                  `Your ticket has been created successfully.\n\n` +
                  `🔗 [Open your ticket](https://discord.com/channels/${guild.id}/${ticketChannel.id})`
                ),
            ],
          });
        } catch {}

        // Modlog entry
        if (modlog) {
          modlog.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🧾 Ticket Created')
                .setColor(BLUE)
                .setDescription(`**User:** ${interaction.user}\n**Reason:** ${reason}\n**Channel:** ${ticketChannel}`)
                .setTimestamp(),
            ],
          }).catch(() => {});
        }

        return interaction.reply({ content: `✅ Your ticket has been created: ${ticketChannel}`, ephemeral: true });
      }

      // ----- BUTTONS: CLAIM / HOLD / CLOSE -----
      if (interaction.isButton()) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        const modlog = guild.channels.cache.get(MODLOGS_CHANNEL_ID) || null;

        // Claim
        if (interaction.customId === 'ticket_claim') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ You need staff permissions to claim.', ephemeral: true });
          }

          // Try to find the staff thread and add the claimer
          const staffThread = channel?.threads?.cache.find(t => t.name.startsWith('staff-')) || null;
          if (staffThread) {
            await staffThread.members.add(interaction.user.id).catch(() => {});
            await staffThread.send({ content: `Claimed by ${interaction.user}.` }).catch(() => {});
          }

          await channel.send({ content: `✅ Ticket claimed by ${interaction.user}.` });
          if (modlog) {
            modlog.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle('📌 Ticket Claimed')
                  .setColor(BLUE)
                  .setDescription(`**Moderator:** ${interaction.user}\n**Channel:** ${channel}`)
                  .setTimestamp(),
              ],
            }).catch(() => {});
          }
          return interaction.deferUpdate();
        }

        // Hold
        if (interaction.customId === 'ticket_hold') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ You need staff permissions to hold.', ephemeral: true });
          }
          await channel.setTopic('ON HOLD').catch(() => {});
          await channel.send({ content: `⏸️ Ticket placed on hold by ${interaction.user}.` });
          if (modlog) {
            modlog.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle('⏸️ Ticket On Hold')
                  .setColor(BLUE)
                  .setDescription(`**Moderator:** ${interaction.user}\n**Channel:** ${channel}`)
                  .setTimestamp(),
              ],
            }).catch(() => {});
          }
          return interaction.deferUpdate();
        }

        // Close prompt
        if (interaction.customId === 'ticket_close') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ You need staff permissions to close.', ephemeral: true });
          }
          return interaction.reply({
            content: 'Are you sure you want to close this ticket?',
            components: [closeConfirmRow()],
            ephemeral: true,
          });
        }

        // Close confirm
        if (interaction.customId === 'ticket_close_confirm') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ You need staff permissions to close.', ephemeral: true });
          }

          await interaction.update({ content: 'Closing ticket…', components: [] }).catch(() => {});

          // Build transcript text
          const transcriptText = await buildTranscript(channel);

          // Send transcript to modlogs (as a txt file)
          if (modlog) {
            await modlog.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle('✅ Ticket Closed')
                  .setColor(BLUE)
                  .setDescription(`**Closed by:** ${interaction.user}\n**Channel:** ${channel}`)
                  .setTimestamp(),
              ],
              files: [{ attachment: Buffer.from(transcriptText, 'utf8'), name: `transcript-${channel.id}.txt` }],
            }).catch(() => {});
          }

          // Notify channel and schedule deletion
          await channel.send('✅ Ticket will be closed in 10 seconds.').catch(() => {});
          setTimeout(() => channel.delete('Ticket closed').catch(() => {}), 10_000);
          return;
        }

        // Close cancel
        if (interaction.customId === 'ticket_close_cancel') {
          return interaction.update({ content: 'Close cancelled.', components: [] });
        }
      }
    } catch (err) {
      console.error('❌ Ticket handler error:', err);
      if (interaction.deferred || interaction.replied) return;
      try { await interaction.reply({ content: '❌ Interaction failed. Try again.', ephemeral: true }); } catch {}
    }
  },
};
