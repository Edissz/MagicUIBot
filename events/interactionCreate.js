const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThreadAutoArchiveDuration,
  AttachmentBuilder
} = require('discord.js');
const { saveTranscript } = require('../utils/transcript');

const CATEGORY_ID = '1405640921017745419';
const MODLOG_ID = '1355260778965373000';
const STAFF_ROLE_1 = '1405207645618700349';
const STAFF_ROLE_2 = '1324536259439362089';

function sanitizeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 20) || 'ticket';
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!client.__seenInteractions) client.__seenInteractions = new Set();

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_reason_select') {
      const reason = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${reason}`)
        .setTitle('Submit Ticket Details');

      const details = new TextInputBuilder()
        .setCustomId('issue_details')
        .setLabel('Describe your issue in detail')
        .setPlaceholder('Explain what happened and what you need help with.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      const steps = new TextInputBuilder()
        .setCustomId('steps_taken')
        .setLabel('Steps you’ve already tried')
        .setPlaceholder('List anything you’ve already done to fix the issue.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(800);

      const notes = new TextInputBuilder()
        .setCustomId('extra_notes')
        .setLabel('Additional notes (optional)')
        .setPlaceholder('Any extra context or links you’d like to include.')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200);

      modal.addComponents(
        new ActionRowBuilder().addComponents(details),
        new ActionRowBuilder().addComponents(steps),
        new ActionRowBuilder().addComponents(notes)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
      await interaction.deferReply({ ephemeral: true });

      const type = interaction.customId.replace('ticket_modal_', '');
      const issue_details = interaction.fields.getTextInputValue('issue_details');
      const steps_taken = interaction.fields.getTextInputValue('steps_taken');
      const extra_notes = interaction.fields.getTextInputValue('extra_notes') || 'N/A';

      const nameBase = sanitizeName(interaction.user.username);
      const channelName = `ticket-${nameBase}-${type}`;
      const parent = interaction.guild.channels.cache.get(CATEGORY_ID);
      if (!parent) return interaction.editReply({ content: '⚠️ Category not found. Please contact an administrator.' });

      const overwrites = [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
        { id: STAFF_ROLE_2, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] }
      ];

      const ch = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: overwrites,
        reason: `Ticket created by ${interaction.user.tag} (${interaction.user.id})`
      });

      const color = 0x5865f2;
      const openEmbed = new EmbedBuilder()
        .setTitle('Magic UI Support Ticket')
        .setColor(color)
        .setDescription(
          `A new support ticket has been opened.\n\n` +
          `**Submitted by:** ${interaction.user} \`(${interaction.user.id})\`\n` +
          `**Ticket Type:** \`${type}\`\n\n` +
          `**Issue Details:**\n${issue_details}\n\n` +
          `**Steps Tried:**\n${steps_taken}\n\n` +
          `**Additional Notes:**\n${extra_notes}\n\n` +
          `A staff member will review your issue shortly. Please avoid tagging staff members unless necessary.`
        )
        .setTimestamp();

      const staffRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('✅ Claim Ticket').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_hold').setLabel('⏸️ Put On Hold').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_close').setLabel('🗑️ Close Ticket').setStyle(ButtonStyle.Danger)
      );

      await ch.send({
        content: `${interaction.user} <@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
        embeds: [openEmbed],
        components: [staffRow]
      });

      const thread = await ch.threads.create({
        name: `staff-${nameBase}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        reason: 'Private staff discussion thread'
      });

      await thread.members.add(client.user.id).catch(() => null);
      await thread.send('🧩 This is a private staff-only thread for internal discussion regarding this ticket.');

      try {
        await interaction.user.send({
          content: `✅ Your ticket has been successfully created: ${ch.toString()}\nA staff member will assist you shortly.`
        });
      } catch {}

      const modlog = interaction.guild.channels.cache.get(MODLOG_ID);
      if (modlog) {
        const ml = new EmbedBuilder()
          .setTitle('Ticket Created')
          .setColor(color)
          .setDescription(
            `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
            `**Channel:** ${ch.toString()} (${ch.id})\n` +
            `**Type:** ${type}\n` +
            `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
          );
        await modlog.send({ embeds: [ml] });
      }

      return interaction.editReply({ content: ' <:check:1430525546608988203> Your support ticket has been opened successfully.' });
    }

    if (interaction.isButton() && /^ticket_(claim|hold|close)$/.test(interaction.customId)) {
      await interaction.deferReply({ ephemeral: true });
      const color = 0x5865f2;
      const modlog = interaction.guild.channels.cache.get(MODLOG_ID);
      const channel = interaction.channel;

      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.editReply({ content: '⚠️ Invalid ticket channel.' });
      }

      // CLAIM BUTTON
      if (interaction.customId === 'ticket_claim') {
        await channel.setName(`📥｜claimed-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, '')}`).catch(() => null);
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📥 Ticket Claimed')
              .setColor(color)
              .setDescription(`This ticket has been **claimed by ${interaction.user}**.\nThey will assist you shortly.`)
              .setTimestamp()
          ]
        });
        await interaction.editReply({ content: ` <:check:1430525546608988203> Ticket claimed by ${interaction.user}.` });

        const e = new EmbedBuilder()
          .setTitle('📥 Ticket Claimed')
          .setColor(color)
          .setDescription(`**Channel:** ${channel}\n**Claimed by:** ${interaction.user.tag}\n**At:** <t:${Math.floor(Date.now() / 1000)}:F>`);
        if (modlog) await modlog.send({ embeds: [e] });
        return;
      }

      // HOLD BUTTON
      if (interaction.customId === 'ticket_hold') {
        await channel.setName(`⏸️｜hold-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, '')}`).catch(() => null);
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('⏸️ Ticket On Hold')
              .setColor(0xfaa61a)
              .setDescription(`This ticket has been **put on hold by ${interaction.user}**.\nPlease wait for further updates.`)
              .setTimestamp()
          ]
        });
        await interaction.editReply({ content: '⏸️ Ticket marked as on hold.' });

        const e = new EmbedBuilder()
          .setTitle('⏸️ Ticket On Hold')
          .setColor(color)
          .setDescription(`**Channel:** ${channel}\n**By:** ${interaction.user.tag}\n**At:** <t:${Math.floor(Date.now() / 1000)}:F>`);
        if (modlog) await modlog.send({ embeds: [e] });
        return;
      }

      // CLOSE BUTTON
      if (interaction.customId === 'ticket_close') {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel(' <:check:1430525546608988203> Confirm Close').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('✖️ Cancel').setStyle(ButtonStyle.Secondary)
        );
        return interaction.editReply({ content: '⚠️ Are you sure you want to close this ticket?', components: [confirmRow] });
      }
    }

    if (interaction.isButton() && /^ticket_close_(confirm|cancel)$/.test(interaction.customId)) {
      await interaction.deferUpdate();
      const channel = interaction.channel;
      const color = 0x5865f2;
      const modlog = interaction.guild.channels.cache.get(MODLOG_ID);

      if (interaction.customId === 'ticket_close_cancel') {
        return interaction.editReply({ content: '❌ Ticket closure cancelled.', components: [] });
      }

      if (!channel) return interaction.editReply({ content: '⚠️ Channel not found.', components: [] });

      await channel.setName(`✅｜closed-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, '')}`).catch(() => null);
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Ticket Closed')
            .setColor(color)
            .setDescription(`This ticket has been **closed by ${interaction.user}**. A transcript will be saved shortly.`)
            .setTimestamp()
        ]
      });

      const content = await saveTranscript(channel);
      const file = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: `transcript-${channel.id}.txt` });

      const e = new EmbedBuilder()
        .setTitle(' <:check:1430525546608988203> Ticket Closed')
        .setColor(color)
        .setDescription(
          `**Channel:** #${channel.name}\n**Closed by:** ${interaction.user.tag}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setTimestamp();

      if (modlog) await modlog.send({ embeds: [e], files: [file] });

      await interaction.editReply({ content: ' <:check:1430525546608988203> Ticket closed. Transcript has been archived.', components: [] });
      setTimeout(() => channel.delete('Ticket closed'), 2000).catch(() => null);
    }
  }
};
