const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThreadAutoArchiveDuration,
  AttachmentBuilder
} = require('discord.js');
const { saveTranscript } = require('../utils/transcript');
const {
  EMOJI_TEXT,
  EPHEMERAL_V2_FLAGS,
  SILENT_MENTIONS,
  STAFF_ROLE_IDS,
  SUPPORT_CATEGORY_ID,
  SUPPORT_MODLOG_ID,
  V2_FLAGS,
  buildCloseConfirmComponents,
  buildLogComponents,
  buildNoticeComponents,
  buildSupportMenuComponents,
  buildTicketOpenedComponents,
  supportReason
} = require('../utils/supportV2');

function sanitizeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'ticket';
}

function cleanChannelName(channelName) {
  return channelName.replace(/^(claimed-|hold-|closed-)/i, '').slice(0, 80);
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!client.__seenInteractions) client.__seenInteractions = new Set();

    if (interaction.isChatInputCommand() && interaction.commandName === 'support') {
      return interaction.reply({
        components: buildSupportMenuComponents(),
        flags: EPHEMERAL_V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_reason_select') {
      const reason = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${reason}`)
        .setTitle(`${supportReason(reason).label} Details`);

      const details = new TextInputBuilder()
        .setCustomId('issue_details')
        .setLabel('Describe your issue in detail')
        .setPlaceholder('Explain what happened and what you need help with.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      const steps = new TextInputBuilder()
        .setCustomId('steps_taken')
        .setLabel('Steps you have already tried')
        .setPlaceholder('List anything you have already done to fix the issue.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(800);

      const notes = new TextInputBuilder()
        .setCustomId('extra_notes')
        .setLabel('Additional notes (optional)')
        .setPlaceholder('Any extra context, order IDs, screenshots, or links.')
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
      const reason = supportReason(type);
      const issueDetails = interaction.fields.getTextInputValue('issue_details');
      const stepsTaken = interaction.fields.getTextInputValue('steps_taken');
      const extraNotes = interaction.fields.getTextInputValue('extra_notes') || 'N/A';

      const nameBase = sanitizeName(interaction.user.username);
      const channelName = `ticket-${nameBase}-${type}`;
      const parent = interaction.guild.channels.cache.get(SUPPORT_CATEGORY_ID);
      if (!parent) {
        return interaction.editReply({
          components: buildNoticeComponents(
            `${EMOJI_TEXT.cross} Category Not Found`,
            'The support category is not available. Please contact an administrator.',
            0xef4444
          ),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      const overwrites = [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks
          ]
        },
        ...STAFF_ROLE_IDS.map(roleId => ({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.ManageChannels
          ]
        }))
      ];

      const ch = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: SUPPORT_CATEGORY_ID,
        topic: `Magic UI support ticket | owner:${interaction.user.id} | reason:${type}`,
        permissionOverwrites: overwrites,
        reason: `Ticket created by ${interaction.user.tag} (${interaction.user.id})`
      });

      await ch.send({
        components: buildTicketOpenedComponents({
          user: interaction.user,
          type,
          issueDetails,
          stepsTaken,
          extraNotes
        }),
        flags: V2_FLAGS,
        allowedMentions: {
          users: [interaction.user.id],
          roles: STAFF_ROLE_IDS
        }
      });

      const thread = await ch.threads.create({
        name: `staff-${nameBase}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        reason: 'Private staff discussion thread'
      });

      await thread.members.add(client.user.id).catch(() => null);
      await thread.send({
        components: buildNoticeComponents(
          `${EMOJI_TEXT.support} Staff Discussion`,
          'This is a private staff-only thread for internal discussion regarding this ticket.',
          0x2b2d31
        ),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });

      await interaction.user.send({
        components: buildNoticeComponents(
          `${EMOJI_TEXT.check} Ticket Created`,
          `Your ticket has been successfully created: ${ch}. A staff member will assist you shortly.`,
          0x22c55e
        ),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      }).catch(() => null);

      const modlog = interaction.guild.channels.cache.get(SUPPORT_MODLOG_ID);
      if (modlog) {
        await modlog.send({
          components: buildLogComponents(
            'Ticket Created',
            [
              `User: ${interaction.user.tag} (${interaction.user.id})`,
              `Channel: ${ch} (${ch.id})`,
              `Type: ${reason.label}`,
              `Time: <t:${Math.floor(Date.now() / 1000)}:F>`
            ].join('\n'),
            0x2b2d31
          ),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      return interaction.editReply({
        components: buildNoticeComponents(
          `${EMOJI_TEXT.check} Ticket Opened`,
          `Your support ticket has been opened successfully: ${ch}`,
          0x22c55e
        ),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
    }

    if (interaction.isButton() && /^ticket_(claim|hold|close)$/.test(interaction.customId)) {
      await interaction.deferReply({ ephemeral: true });
      const modlog = interaction.guild.channels.cache.get(SUPPORT_MODLOG_ID);
      const channel = interaction.channel;

      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.editReply({
          components: buildNoticeComponents(`${EMOJI_TEXT.cross} Invalid Ticket Channel`, 'This button can only be used inside a ticket channel.', 0xef4444),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (interaction.customId === 'ticket_claim') {
        await channel.setName(`claimed-${cleanChannelName(channel.name)}`).catch(() => null);
        await channel.send({
          components: buildNoticeComponents(
            `${EMOJI_TEXT.check} Ticket Claimed`,
            `This ticket has been claimed by ${interaction.user}.`,
            0x22c55e
          ),
          flags: V2_FLAGS,
          allowedMentions: { users: [interaction.user.id] }
        });

        if (modlog) {
          await modlog.send({
            components: buildLogComponents(
              'Ticket Claimed',
              `Channel: ${channel}\nClaimed by: ${interaction.user.tag}\nAt: <t:${Math.floor(Date.now() / 1000)}:F>`,
              0x2b2d31
            ),
            flags: V2_FLAGS,
            allowedMentions: SILENT_MENTIONS
          });
        }

        return interaction.editReply({
          components: buildNoticeComponents(`${EMOJI_TEXT.check} Ticket Claimed`, `Ticket claimed by ${interaction.user}.`, 0x22c55e),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (interaction.customId === 'ticket_hold') {
        await channel.setName(`hold-${cleanChannelName(channel.name)}`).catch(() => null);
        await channel.send({
          components: buildNoticeComponents(
            `${EMOJI_TEXT.general} Ticket On Hold`,
            `This ticket has been put on hold by ${interaction.user}.`,
            0xfaa61a
          ),
          flags: V2_FLAGS,
          allowedMentions: { users: [interaction.user.id] }
        });

        if (modlog) {
          await modlog.send({
            components: buildLogComponents(
              'Ticket On Hold',
              `Channel: ${channel}\nBy: ${interaction.user.tag}\nAt: <t:${Math.floor(Date.now() / 1000)}:F>`,
              0x2b2d31
            ),
            flags: V2_FLAGS,
            allowedMentions: SILENT_MENTIONS
          });
        }

        return interaction.editReply({
          components: buildNoticeComponents(`${EMOJI_TEXT.check} Ticket Updated`, 'Ticket marked as on hold.', 0xfaa61a),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (interaction.customId === 'ticket_close') {
        return interaction.editReply({
          components: buildCloseConfirmComponents(),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }
    }

    if (interaction.isButton() && /^ticket_close_(confirm|cancel)$/.test(interaction.customId)) {
      const channel = interaction.channel;
      const modlog = interaction.guild.channels.cache.get(SUPPORT_MODLOG_ID);

      if (interaction.customId === 'ticket_close_cancel') {
        return interaction.update({
          components: buildNoticeComponents(`${EMOJI_TEXT.cross} Ticket Closure Cancelled`, 'The ticket was left open.', 0x2b2d31),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      await interaction.deferUpdate();

      if (!channel) {
        return interaction.editReply({
          components: buildNoticeComponents(`${EMOJI_TEXT.cross} Channel Not Found`, 'The ticket channel could not be found.', 0xef4444),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      await channel.setName(`closed-${cleanChannelName(channel.name)}`).catch(() => null);

      await channel.send({
        components: buildNoticeComponents(
          `${EMOJI_TEXT.check} Ticket Closed`,
          `This ticket has been closed by ${interaction.user}. A transcript will be saved and the channel will be deleted in a few seconds.`,
          0x22c55e
        ),
        flags: V2_FLAGS,
        allowedMentions: { users: [interaction.user.id] }
      });

      const content = await saveTranscript(channel);
      const transcriptName = `transcript-${channel.id}.txt`;
      const file = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: transcriptName });

      if (modlog) {
        await modlog.send({
          components: buildLogComponents(
            `${EMOJI_TEXT.check} Ticket Closed`,
            `Channel: #${channel.name}\nClosed by: ${interaction.user.tag}\nTime: <t:${Math.floor(Date.now() / 1000)}:F>`,
            0x2b2d31,
            transcriptName
          ),
          files: [file],
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      await interaction.editReply({
        components: buildNoticeComponents(`${EMOJI_TEXT.check} Ticket Closed`, 'Ticket closed. Transcript archived. Channel will delete shortly.', 0x22c55e),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });

      setTimeout(async () => {
        try {
          await channel.delete('Ticket closed and deleted automatically');
        } catch (err) {
          console.error('Failed to delete ticket channel:', err);
        }
      }, 7000);
    }
  }
};
