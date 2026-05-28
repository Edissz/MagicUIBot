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
  VERIFIED_ROLE_ID,
  V2_FLAGS,
  buildCloseConfirmComponents,
  buildLogComponents,
  buildNoticeComponents,
  buildRoleRestoreResultComponents,
  buildSupportMenuComponents,
  buildTicketOpenedComponents,
  buildVerificationResultComponents,
  supportReason
} = require('../utils/supportV2');
const { restoreSnapshotRoles, getRoleSnapshot, setRestoreDecision } = require('../utils/memberRoleStore');
const { consumeChallenge, createChallenge, shouldSendFailureReminder } = require('../utils/verificationStore');

const VERIFICATION_FAILURE_REMINDER = [
  `${EMOJI_TEXT.fingerprintScan} Your Magic UI verification did not go through.`,
  '',
  'Open the Magic UI server, send a message in any channel, then select **Verify Now** and type the word exactly as shown.',
  '',
  'This reminder is sent at most once every 48 hours.'
].join('\n');

function sanitizeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'ticket';
}

function cleanChannelName(channelName) {
  return channelName.replace(/^(claimed-|hold-|resolved-|closed-)/i, '').slice(0, 80);
}

function canManageTicket(member) {
  if (!member?.roles?.cache || !member.permissions) return false;
  return STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId)) ||
    member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function ticketOwnerId(channel) {
  return channel?.topic?.match(/owner:(\d{17,20})/)?.[1] || null;
}

function findOpenTicket(guild, userId) {
  return guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildText &&
    channel.parentId === SUPPORT_CATEGORY_ID &&
    channel.topic?.includes(`owner:${userId}`) &&
    !channel.name.startsWith('closed-')
  );
}

function queueVerificationFailureReminder(user) {
  if (!shouldSendFailureReminder(user.id)) return;

  user.send(VERIFICATION_FAILURE_REMINDER).catch(err => {
    console.warn(`Could not DM verification failure reminder to ${user.tag}:`, err.message);
  });
}

async function fetchSupportCategory(guild) {
  const cached = guild.channels.cache.get(SUPPORT_CATEGORY_ID);
  if (cached) return cached;
  return guild.channels.fetch(SUPPORT_CATEGORY_ID).catch(() => null);
}

async function buildTicketOverwrites(guild, userId) {
  const staffRoleIds = [];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: userId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    }
  ];

  for (const roleId of STAFF_ROLE_IDS) {
    const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      console.warn(`Skipping missing support staff role ${roleId}`);
      continue;
    }

    staffRoleIds.push(role.id);
    overwrites.push({
      id: role.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ManageChannels
      ]
    });
  }

  return { overwrites, staffRoleIds };
}

async function editInteractionNotice(interaction, title, body, color = 0xef4444) {
  const payload = {
    components: buildNoticeComponents(title, body, color),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload).catch(() => null);
  }

  return interaction.reply({
    ...payload,
    flags: EPHEMERAL_V2_FLAGS
  }).catch(() => null);
}

async function sendTranscriptLog({ channel, interaction, modlog, title = 'Ticket Transcript Saved' }) {
  const content = await saveTranscript(channel);
  const transcriptName = `transcript-${channel.id}-${Date.now()}.txt`;
  const file = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: transcriptName });

  if (modlog) {
    await modlog.send({
      components: buildLogComponents(
        title,
        [
          `Channel: #${channel.name} (${channel.id})`,
          `Requested by: ${interaction.user.tag} (${interaction.user.id})`,
          `Time: <t:${Math.floor(Date.now() / 1000)}:F>`
        ].join('\n'),
        0x2b2d31,
        transcriptName
      ),
      files: [file],
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  return transcriptName;
}

function replyFlagsFor(interaction) {
  return interaction.guild ? EPHEMERAL_V2_FLAGS : V2_FLAGS;
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

    const verificationStart = interaction.isButton()
      ? interaction.customId.match(/^verify_(start|prompt)_(\d{17,20})$/)
      : null;

    if (verificationStart) {
      const [, source, guildId] = verificationStart;
      const challenge = createChallenge({ guildId, userId: interaction.user.id });
      const modal = new ModalBuilder()
        .setCustomId(`verify_submit_${challenge.token}`)
        .setTitle(`Type: ${challenge.word}`);

      const answer = new TextInputBuilder()
        .setCustomId('captcha_answer')
        .setLabel(`Type this word: ${challenge.word}`)
        .setPlaceholder(challenge.word)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

      modal.addComponents(new ActionRowBuilder().addComponents(answer));
      await interaction.showModal(modal);

      if (source === 'prompt') {
        interaction.message?.delete().catch(() => null);
      }

      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('verify_submit_')) {
      const token = interaction.customId.replace('verify_submit_', '');
      const challenge = consumeChallenge(token);

      if (!challenge || challenge.userId !== interaction.user.id) {
        queueVerificationFailureReminder(interaction.user);

        return interaction.reply({
          components: buildVerificationResultComponents(
            `${EMOJI_TEXT.cross} Verification Expired`,
            'This verification challenge expired or was not created for your account. Select the verify button again to get a fresh CAPTCHA.',
            0xef4444
          ),
          flags: replyFlagsFor(interaction),
          allowedMentions: SILENT_MENTIONS
        });
      }

      const answer = interaction.fields.getTextInputValue('captcha_answer').trim().toUpperCase();
      if (answer !== challenge.word.toUpperCase()) {
        queueVerificationFailureReminder(interaction.user);

        return interaction.reply({
          components: buildVerificationResultComponents(
            `${EMOJI_TEXT.cross} Verification Failed`,
            'The CAPTCHA word did not match. Select the verify button again and type the new word exactly as shown.',
            0xef4444
          ),
          flags: replyFlagsFor(interaction),
          allowedMentions: SILENT_MENTIONS
        });
      }

      const guild = await client.guilds.fetch(challenge.guildId).catch(() => null);
      const member = await guild?.members.fetch(interaction.user.id).catch(() => null);
      let role = guild?.roles.cache.get(VERIFIED_ROLE_ID) || null;
      if (guild && !role) {
        role = await guild.roles.fetch(VERIFIED_ROLE_ID).catch(() => null);
      }

      if (!guild || !member || !role) {
        return interaction.reply({
          components: buildVerificationResultComponents(
            `${EMOJI_TEXT.cross} Verification Could Not Finish`,
            'I could not find the Magic UI server, your membership, or the verified role. Please use `/support` if this continues.',
            0xef4444
          ),
          flags: replyFlagsFor(interaction),
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (!member.roles.cache.has(role.id)) {
        const added = await member.roles.add(role, 'Completed Magic UI CAPTCHA verification')
          .then(() => true)
          .catch(error => {
            console.error(`Failed to add verified role to ${member.user.tag}:`, error.message);
            return false;
          });

        if (!added) {
          return interaction.reply({
            components: buildVerificationResultComponents(
              `${EMOJI_TEXT.cross} Verification Role Failed`,
              'Your CAPTCHA was correct, but I could not add the verified role. Please ask staff to check my role position and Manage Roles permission.',
              0xef4444
            ),
            flags: replyFlagsFor(interaction),
            allowedMentions: SILENT_MENTIONS
          });
        }
      }

      return interaction.reply({
        components: buildVerificationResultComponents(
          `${EMOJI_TEXT.check} Verification Complete`,
          `You are verified in Magic UI and can now chat normally. Welcome in, ${interaction.user}.`,
          0x22c55e
        ),
        flags: replyFlagsFor(interaction),
        allowedMentions: { users: [interaction.user.id] }
      });
    }

    if (interaction.isButton() && /^role_restore_(accept|decline)_\d{17,20}$/.test(interaction.customId)) {
      const [, decision, guildId] = interaction.customId.match(/^role_restore_(accept|decline)_(\d{17,20})$/);
      await interaction.deferUpdate();

      if (decision === 'decline') {
        setRestoreDecision(guildId, interaction.user.id, 'declined');
        return interaction.editReply({
          components: buildRoleRestoreResultComponents(
            `${EMOJI_TEXT.check} Role Restore Skipped`,
            'No previous roles were restored. You can continue with your current server roles.',
            0x2b2d31
          ),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      const guild = await client.guilds.fetch(guildId).catch(() => null);
      const member = await guild?.members.fetch(interaction.user.id).catch(() => null);
      const snapshot = getRoleSnapshot(guildId, interaction.user.id);

      if (!guild || !member || !snapshot) {
        return interaction.editReply({
          components: buildRoleRestoreResultComponents(
            `${EMOJI_TEXT.cross} Restore Failed`,
            'I could not find your saved role snapshot or your current server membership.',
            0xef4444
          ),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      const result = await restoreSnapshotRoles(member, snapshot);
      setRestoreDecision(guildId, interaction.user.id, 'accepted');

      return interaction.editReply({
        components: buildRoleRestoreResultComponents(
          `${EMOJI_TEXT.check} Role Restore Complete`,
          [
            result.restored.length
              ? `Restored roles:\n${result.restored.map(name => `- ${name}`).join('\n')}`
              : 'No roles needed to be restored.',
            '',
            result.skipped.length
              ? `Skipped:\n${result.skipped.slice(0, 10).map(name => `- ${name}`).join('\n')}`
              : 'No roles were skipped.'
          ].join('\n'),
          0x22c55e
        ),
        flags: V2_FLAGS,
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

      try {
        const type = interaction.customId.replace('ticket_modal_', '');
        const reason = supportReason(type);
        const issueDetails = interaction.fields.getTextInputValue('issue_details');
        const stepsTaken = interaction.fields.getTextInputValue('steps_taken');
        const extraNotes = interaction.fields.getTextInputValue('extra_notes') || 'N/A';

        const nameBase = sanitizeName(interaction.user.username);
        const channelName = `ticket-${nameBase}-${type}`;
        const existingTicket = findOpenTicket(interaction.guild, interaction.user.id);
        if (existingTicket) {
          return interaction.editReply({
            components: buildNoticeComponents(
              `${EMOJI_TEXT.cross} Ticket Already Open`,
              `You already have an open ticket: ${existingTicket}. Please continue there instead of opening a duplicate.`,
              0xfaa61a
            ),
            flags: V2_FLAGS,
            allowedMentions: SILENT_MENTIONS
          });
        }

        const parent = await fetchSupportCategory(interaction.guild);
        if (!parent || parent.type !== ChannelType.GuildCategory) {
          return interaction.editReply({
            components: buildNoticeComponents(
              `${EMOJI_TEXT.cross} Support Category Not Found`,
              `I could not find the support category \`${SUPPORT_CATEGORY_ID}\`. Please ask an administrator to check the category ID and bot permissions.`,
              0xef4444
            ),
            flags: V2_FLAGS,
            allowedMentions: SILENT_MENTIONS
          });
        }

        const { overwrites, staffRoleIds } = await buildTicketOverwrites(interaction.guild, interaction.user.id);
        const ch = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: parent.id,
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
            extraNotes,
            staffRoleIds
          }),
          flags: V2_FLAGS,
          allowedMentions: {
            users: [interaction.user.id],
            roles: staffRoleIds
          }
        });

        const thread = await ch.threads.create({
          name: `staff-${nameBase}`,
          type: ChannelType.PrivateThread,
          invitable: false,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
          reason: 'Private staff discussion thread'
        }).catch(err => {
          console.warn('Could not create private staff ticket thread:', err.message);
          return null;
        });

        if (thread) {
          await thread.members.add(client.user.id).catch(() => null);
          await thread.send({
            components: buildNoticeComponents(
              `${EMOJI_TEXT.support} Staff Discussion`,
              'This is a private staff-only thread for internal discussion regarding this ticket.',
              0x2b2d31
            ),
            flags: V2_FLAGS,
            allowedMentions: SILENT_MENTIONS
          }).catch(() => null);
        }

        await interaction.user.send({
          components: buildNoticeComponents(
            `${EMOJI_TEXT.check} Ticket Created`,
            `Your ticket has been successfully created: ${ch}. A staff member will assist you shortly.`,
            0x22c55e
          ),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        }).catch(() => null);

        const modlog = interaction.guild.channels.cache.get(SUPPORT_MODLOG_ID) ||
          await interaction.guild.channels.fetch(SUPPORT_MODLOG_ID).catch(() => null);
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
          }).catch(err => console.warn('Could not send ticket create modlog:', err.message));
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
      } catch (err) {
        console.error('Failed to create support ticket:', err);
        return editInteractionNotice(
          interaction,
          `${EMOJI_TEXT.cross} Ticket Could Not Be Created`,
          'Something went wrong while creating your ticket. Please make sure the bot has Manage Channels, View Channels, Send Messages, and Manage Threads permissions in the support category.',
          0xef4444
        );
      }
    }

    if (interaction.isButton() && /^ticket_(claim|resolve|hold|transcript|close)$/.test(interaction.customId)) {
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

      const isOwner = ticketOwnerId(channel) === interaction.user.id;
      if (!canManageTicket(interaction.member) && !(interaction.customId === 'ticket_close' && isOwner)) {
        return interaction.editReply({
          components: buildNoticeComponents(
            `${EMOJI_TEXT.cross} Staff Action Required`,
            'Only Magic UI staff can manage this ticket action.',
            0xef4444
          ),
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

      if (interaction.customId === 'ticket_resolve') {
        await channel.setName(`resolved-${cleanChannelName(channel.name)}`).catch(() => null);
        await channel.send({
          components: buildNoticeComponents(
            `${EMOJI_TEXT.check} Ticket Marked Resolved`,
            `This ticket has been marked as resolved by ${interaction.user}. If anything is still unclear, continue in this channel before staff closes it.`,
            0x22c55e
          ),
          flags: V2_FLAGS,
          allowedMentions: { users: [interaction.user.id] }
        });

        if (modlog) {
          await modlog.send({
            components: buildLogComponents(
              'Ticket Resolved',
              `Channel: ${channel}\nResolved by: ${interaction.user.tag}\nAt: <t:${Math.floor(Date.now() / 1000)}:F>`,
              0x22c55e
            ),
            flags: V2_FLAGS,
            allowedMentions: SILENT_MENTIONS
          });
        }

        return interaction.editReply({
          components: buildNoticeComponents(`${EMOJI_TEXT.check} Ticket Resolved`, 'Ticket marked as resolved.', 0x22c55e),
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

      if (interaction.customId === 'ticket_transcript') {
        const transcriptName = await sendTranscriptLog({
          channel,
          interaction,
          modlog,
          title: `${EMOJI_TEXT.support} Ticket Transcript Saved`
        });

        return interaction.editReply({
          components: buildNoticeComponents(
            `${EMOJI_TEXT.check} Transcript Saved`,
            modlog
              ? `A transcript was saved to the moderation log as \`${transcriptName}\`.`
              : 'Transcript was generated, but the moderation log channel was not available.',
            modlog ? 0x22c55e : 0xfaa61a
          ),
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

      await sendTranscriptLog({
        channel,
        interaction,
        modlog,
        title: `${EMOJI_TEXT.check} Ticket Closed`
      });

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
