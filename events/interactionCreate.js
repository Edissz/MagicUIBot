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
  AttachmentBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const { saveTranscript } = require('../utils/transcript');

const CATEGORY_ID = '1405640921017745419';
const MODLOG_ID = '1355260778965373000';
const STAFF_ROLE_1 = '1405207645618700349';
const STAFF_ROLE_2 = '1324536259439362089';
const STAFF_ROLE_NAMES_FOR_BUTTONS = ['Moderator', 'Administrator', 'Manager'];

function sanitizeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 20) || 'ticket';
}

function isStaffMember(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return member.roles.cache.some(
    (r) =>
      r.id === STAFF_ROLE_1 ||
      r.id === STAFF_ROLE_2 ||
      STAFF_ROLE_NAMES_FOR_BUTTONS.includes(r.name)
  );
}

function getTicketOwnerId(channel) {
  if (!channel || !channel.topic) return null;
  const m = channel.topic.match(/OWNER:(\d{17,20})/);
  return m ? m[1] : null;
}

function getFeedbackContainer(client, guildId, channelId) {
  if (!client.__ticketFeedback) client.__ticketFeedback = {};
  if (!client.__ticketFeedback[guildId]) client.__ticketFeedback[guildId] = {};
  if (!client.__ticketFeedback[guildId][channelId]) {
    client.__ticketFeedback[guildId][channelId] = {
      rating: null,
      feedback: null,
      wantsTranscript: false,
      closingUserId: null,
      closingUserTag: null
    };
  }
  return client.__ticketFeedback[guildId][channelId];
}

async function finalizeTicketClose(interaction, channel, client) {
  const guild = interaction.guild;
  if (!guild || !channel) return;

  const color = 0x2b2d31;
  const modlog = guild.channels.cache.get(MODLOG_ID);
  const ownerId = getTicketOwnerId(channel);

  let linkedVoiceChannel = null;
  if (channel.topic) {
    const match = channel.topic.match(/VOICE:(\d{17,20})/);
    if (match) {
      linkedVoiceChannel = guild.channels.cache.get(match[1]);
    }
  }

  const data = getFeedbackContainer(client, guild.id, channel.id);
  const rating = data.rating;
  const feedback = data.feedback;
  const wantsTranscript = data.wantsTranscript;
  const closingUserTag = data.closingUserTag || interaction.user.tag;

  await channel
    .setName(`✅｜closed-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, '')}`)
    .catch(() => null);

  let desc =
    `This ticket has been **closed by ${closingUserTag}**.\n` +
    `A transcript will be saved and the channel will be deleted in a few seconds.`;

  if (rating) {
    desc += `\n\n**User rating:** ${rating}/5`;
    if (feedback && feedback.trim().length > 0) {
      desc += `\n**User feedback:** ${feedback}`;
    }
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Ticket Closed')
        .setColor(color)
        .setDescription(desc)
        .setTimestamp()
    ]
  });

  const content = await saveTranscript(channel);
  const file = new AttachmentBuilder(Buffer.from(content, 'utf-8'), {
    name: `transcript-${channel.id}.txt`
  });

  const eLines = [
    `**Channel:** #${channel.name}`,
    `**Closed by:** ${closingUserTag}`,
    `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
  ];
  if (rating) eLines.push(`**User rating:** ${rating}/5`);
  if (feedback && feedback.trim().length > 0) eLines.push(`**User feedback:** ${feedback}`);

  const e = new EmbedBuilder()
    .setTitle(' <:check:1430525546608988203> Ticket Closed')
    .setColor(color)
    .setDescription(eLines.join('\n'))
    .setTimestamp();

  if (modlog) await modlog.send({ embeds: [e], files: [file] });

  const owner = ownerId ? await client.users.fetch(ownerId).catch(() => null) : null;
  if (owner && wantsTranscript) {
    await owner
      .send({
        content: 'Here is the transcript for your closed MagicUI support ticket.',
        files: [file]
      })
      .catch(() => null);
  }

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: ' <:check:1430525546608988203> Thank you for your feedback. This ticket is now closed.',
        components: []
      });
    } else {
      await interaction.reply({
        content: ' <:check:1430525546608988203> Thank you for your feedback. This ticket is now closed.',
        ephemeral: true
      });
    }
  } catch {}

  setTimeout(async () => {
    try {
      if (linkedVoiceChannel) {
        await linkedVoiceChannel.delete('Linked voice ticket channel closed');
      }
    } catch (err) {
      console.error('Failed to delete linked voice channel:', err);
    }

    try {
      await channel.delete('Ticket closed and deleted automatically');
    } catch (err) {
      console.error('Failed to delete ticket channel:', err);
    }
  }, 7000);
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!client.__seenInteractions) client.__seenInteractions = new Set();
    if (client.__seenInteractions.has(interaction.id)) return;
    client.__seenInteractions.add(interaction.id);
    setTimeout(() => client.__seenInteractions.delete(interaction.id), 60000);

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

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_transfer_select') {
      const channel = interaction.channel;
      const guild = interaction.guild;
      if (!channel || !guild) return;

      if (!isStaffMember(interaction.member)) {
        return interaction.reply({
          content: '⚠️ You are not allowed to transfer tickets.',
          ephemeral: true
        });
      }

      const value = interaction.values[0];
      let targetRoleId = null;
      let label = '';

      if (value === 'mod') {
        targetRoleId = STAFF_ROLE_1;
        label = 'Moderator Team';
      } else if (value === 'admin') {
        targetRoleId = STAFF_ROLE_2;
        label = 'Admin Team';
      } else if (value === 'manager') {
        targetRoleId = STAFF_ROLE_2;
        label = 'Manager Team';
      }

      await interaction.update({
        content: `Ticket transferred to ${label}.`,
        embeds: [],
        components: []
      });

      const ownerId = getTicketOwnerId(channel);

      const transferEmbed = new EmbedBuilder()
        .setTitle('Ticket Transferred')
        .setColor(0x2b2d31)
        .setDescription(
          `This ticket has been transferred to the **${label}** by ${interaction.user}.\n` +
            'Please wait for a response from the new handler.'
        )
        .setTimestamp();

      const mentions = [];
      if (ownerId) mentions.push(`<@${ownerId}>`);
      if (targetRoleId) mentions.push(`<@&${targetRoleId}>`);

      await channel.send({
        content: mentions.join(' ') || null,
        embeds: [transferEmbed]
      });

      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
      await interaction.deferReply({ ephemeral: true });

      const type = interaction.customId.replace('ticket_modal_', '');
      const issue_details = interaction.fields.getTextInputValue('issue_details');
      const steps_taken = interaction.fields.getTextInputValue('steps_taken');
      const extra_notes = interaction.fields.getTextInputValue('extra_notes') || 'N/A';

      const nameBase = sanitizeName(interaction.user.username);
      const parent = interaction.guild.channels.cache.get(CATEGORY_ID);
      if (!parent) {
        return interaction.editReply({
          content: '⚠️ Category not found. Please contact an administrator.'
        });
      }

      const overwrites = [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: STAFF_ROLE_1,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels
          ]
        },
        {
          id: STAFF_ROLE_2,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ];

      let ch;
      let voiceChannel = null;

      if (type === 'voice') {
        const textName = `voice-ticket-${nameBase}`;
        ch = await interaction.guild.channels.create({
          name: textName,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: overwrites,
          reason: `Voice ticket created by ${interaction.user.tag} (${interaction.user.id})`
        });

        voiceChannel = await interaction.guild.channels.create({
          name: `🎧｜voice-${nameBase}`,
          type: ChannelType.GuildVoice,
          parent: CATEGORY_ID,
          permissionOverwrites: overwrites,
          reason: `Voice support channel for ${interaction.user.tag} (${interaction.user.id})`
        });

        await ch.setTopic(
          `OWNER:${interaction.user.id} | TYPE:${type} | VOICE:${voiceChannel.id}`
        );
      } else {
        const channelName = `ticket-${nameBase}-${type}`;
        ch = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: overwrites,
          reason: `Ticket created by ${interaction.user.tag} (${interaction.user.id})`
        });

        await ch.setTopic(`OWNER:${interaction.user.id} | TYPE:${type}`);
      }

      const color = 0x2b2d31;

      let description =
        `A new support ticket has been opened.\n\n` +
        `**Submitted by:** ${interaction.user} \`(${interaction.user.id})\`\n` +
        `**Ticket Type:** \`${type}\`\n\n` +
        `**Issue Details:**\n${issue_details}\n\n` +
        `**Steps Tried:**\n${steps_taken}\n\n` +
        `**Additional Notes:**\n${extra_notes}\n\n` +
        `A staff member will review your issue shortly. Please avoid tagging staff members unless necessary.`;

      if (type === 'voice' && voiceChannel) {
        description =
          `A new **voice support meeting** has been requested.\n\n` +
          `**Submitted by:** ${interaction.user} \`(${interaction.user.id})\`\n` +
          `**Ticket Type:** \`${type}\`\n\n` +
          `**Issue Details:**\n${issue_details}\n\n` +
          `**Steps Tried:**\n${steps_taken}\n\n` +
          `**Additional Notes:**\n${extra_notes}\n\n` +
          `**Voice Channel:** ${voiceChannel.toString()}\n\n` +
          `Please join the voice channel when you are ready. You can use mic, camera and screen share.\n` +
          `A staff member will join as soon as possible.`;
      }

      const openEmbed = new EmbedBuilder()
        .setTitle('Magic UI Support Ticket')
        .setColor(color)
        .setDescription(description)
        .setImage(
          'https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif?ex=68fa1f29&is=68f8cda9&hm=06e75e6659eff21a4e1cd2f3d4073b241c9e5e661ea85fdda42b6f8592ce0164'
        )
        .setTimestamp();

      const staffRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('✅ Claim Ticket').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_hold').setLabel('⏸️ Put On Hold').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_transfer').setLabel('🔁 Transfer Ticket').setStyle(ButtonStyle.Secondary),
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
        reason: 'Private staff-only thread'
      });

      await thread.members.add(client.user.id).catch(() => null);
      await thread.send('🧩 This is a private staff-only thread for internal discussion regarding this ticket.');

      try {
        await interaction.user.send({
          content:
            type === 'voice' && voiceChannel
              ? `✅ Your voice support ticket has been created: ${ch.toString()}\nJoin ${voiceChannel.toString()} when you are ready.`
              : `✅ Your ticket has been successfully created: ${ch.toString()}\nA staff member will assist you shortly.`
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

      return interaction.editReply({
        content: ' <:check:1430525546608988203> Your support ticket has been opened successfully.'
      });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket_feedback_modal') {
      const channel = interaction.channel;
      const guild = interaction.guild;
      if (!channel || !guild) {
        return interaction.reply({ content: '⚠️ Channel not found.', ephemeral: true });
      }

      const ownerId = getTicketOwnerId(channel);
      if (!ownerId || interaction.user.id !== ownerId) {
        return interaction.reply({
          content: 'Only the ticket owner can send this feedback.',
          ephemeral: true
        });
      }

      const feedback = interaction.fields.getTextInputValue('feedback_details');
      const data = getFeedbackContainer(client, guild.id, channel.id);
      data.feedback = feedback;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_transcript_yes')
          .setLabel('Yes, send transcript')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_transcript_no')
          .setLabel('No, just close')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: 'Thank you for your feedback. Would you like to receive a transcript of this conversation?',
        components: [row],
        ephemeral: true
      });
    }

    if (
      interaction.isButton() &&
      /^ticket_(claim|hold|close|transfer)$/.test(interaction.customId)
    ) {
      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.reply({ content: '⚠️ Invalid ticket channel.', ephemeral: true });
      }

      if (interaction.customId === 'ticket_transfer') {
        if (!isStaffMember(interaction.member)) {
          return interaction.reply({
            content: '⚠️ You are not allowed to transfer tickets.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('Transfer Ticket')
          .setColor(0x2b2d31)
          .setDescription('Select which team should take over this ticket.');

        const menu = new StringSelectMenuBuilder()
          .setCustomId('ticket_transfer_select')
          .setPlaceholder('Select a team to transfer to')
          .addOptions(
            { label: 'Moderator Team', value: 'mod', description: 'Transfer to Moderators' },
            { label: 'Admin Team', value: 'admin', description: 'Transfer to Admins' },
            { label: 'Manager Team', value: 'manager', description: 'Transfer to Managers' }
          );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
          ephemeral: true,
          embeds: [embed],
          components: [row]
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const color = 0x2b2d31;
      const modlog = interaction.guild.channels.cache.get(MODLOG_ID);

      if (interaction.customId === 'ticket_claim') {
        if (!isStaffMember(interaction.member)) {
          return interaction.editReply({
            content: '⚠️ You are not allowed to claim tickets.'
          });
        }

        await channel
          .setName(`📥｜claimed-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, '')}`)
          .catch(() => null);

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📥 Ticket Claimed')
              .setColor(color)
              .setDescription(
                `This ticket has been **claimed by ${interaction.user}**.\nYou will now receive customer support from the Magic UI team in this channel.`
              )
              .setTimestamp()
          ]
        });

        await interaction.editReply({
          content: ` <:check:1430525546608988203> Ticket claimed by ${interaction.user}.`
        });

        const e = new EmbedBuilder()
          .setTitle('📥 Ticket Claimed')
          .setColor(color)
          .setDescription(
            `**Channel:** ${channel}\n**Claimed by:** ${interaction.user.tag}\n**At:** <t:${Math.floor(
              Date.now() / 1000
            )}:F>`
          );

        if (modlog) await modlog.send({ embeds: [e] });
        return;
      }

      if (interaction.customId === 'ticket_hold') {
        await channel
          .setName(`⏸️｜hold-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, '')}`)
          .catch(() => null);

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('⏸️ Ticket On Hold')
              .setColor(0xfaa61a)
              .setDescription(`This ticket has been **put on hold by ${interaction.user}**.`)
              .setTimestamp()
          ]
        });

        await interaction.editReply({ content: '⏸️ Ticket marked as on hold.' });

        const e = new EmbedBuilder()
          .setTitle('⏸️ Ticket On Hold')
          .setColor(color)
          .setDescription(
            `**Channel:** ${channel}\n**By:** ${interaction.user.tag}\n**At:** <t:${Math.floor(
              Date.now() / 1000
            )}:F>`
          );

        if (modlog) await modlog.send({ embeds: [e] });
        return;
      }

      if (interaction.customId === 'ticket_close') {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_close_confirm')
            .setLabel('Confirm Close')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('ticket_close_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );
        return interaction.editReply({
          content: 'Are you sure you want to close this ticket?',
          components: [confirmRow]
        });
      }
    }

    if (interaction.isButton() && /^ticket_close_(confirm|cancel)$/.test(interaction.customId)) {
      await interaction.deferUpdate();
      const channel = interaction.channel;
      const guild = interaction.guild;

      if (interaction.customId === 'ticket_close_cancel') {
        return interaction.editReply({ content: '❌ Ticket closure cancelled.', components: [] });
      }

      if (!channel || !guild) {
        return interaction.editReply({
          content: '⚠️ Channel not found.',
          components: []
        });
      }

      const ownerId = getTicketOwnerId(channel);
      if (!ownerId) {
        return interaction.editReply({
          content: '⚠️ Ticket owner not found. Please close this ticket manually.',
          components: []
        });
      }

      const data = getFeedbackContainer(client, guild.id, channel.id);
      data.closingUserId = interaction.user.id;
      data.closingUserTag = interaction.user.tag;
      data.rating = null;
      data.feedback = null;
      data.wantsTranscript = false;

      const ratingEmbed = new EmbedBuilder()
        .setTitle('Rate Your Support Experience')
        .setColor(0x2b2d31)
        .setDescription(
          'How would you rate your customer support experience with Magic UI?\n\n' +
            'Please choose a rating from **1** (poor) to **5** (excellent).'
        );

      const ratingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_rate_1').setLabel('1').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_rate_2').setLabel('2').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_rate_3').setLabel('3').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_rate_4').setLabel('4').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_rate_5').setLabel('5').setStyle(ButtonStyle.Success)
      );

      await channel.send({
        content: `<@${ownerId}>`,
        embeds: [ratingEmbed],
        components: [ratingRow]
      });

      return interaction.editReply({
        content: 'A rating request has been sent to the user. The ticket will be closed after feedback is submitted.',
        components: []
      });
    }

    if (interaction.isButton() && /^ticket_rate_[1-5]$/.test(interaction.customId)) {
      const channel = interaction.channel;
      const guild = interaction.guild;
      if (!channel || !guild) {
        return interaction.reply({ content: '⚠️ Channel not found.', ephemeral: true });
      }

      const ownerId = getTicketOwnerId(channel);
      if (!ownerId) {
        return interaction.reply({
          content: '⚠️ Ticket owner not found.',
          ephemeral: true
        });
      }

      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: 'Only the ticket owner can rate this support.',
          ephemeral: true
        });
      }

      const rating = parseInt(interaction.customId.split('_')[2], 10);
      const data = getFeedbackContainer(client, guild.id, channel.id);
      data.rating = rating;

      if (rating <= 4) {
        const modal = new ModalBuilder()
          .setCustomId('ticket_feedback_modal')
          .setTitle('Help Us Improve');

        const input = new TextInputBuilder()
          .setCustomId('feedback_details')
          .setLabel('What could we improve?')
          .setPlaceholder('Tell us what went wrong or what we could do better.')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(800);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        return interaction.showModal(modal);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_transcript_yes')
          .setLabel('Yes, send transcript')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_transcript_no')
          .setLabel('No, just close')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: 'Thank you for rating **5/5**. Would you like to receive a transcript of this conversation?',
        components: [row],
        ephemeral: true
      });
    }

    if (
      interaction.isButton() &&
      (interaction.customId === 'ticket_transcript_yes' ||
        interaction.customId === 'ticket_transcript_no')
    ) {
      const channel = interaction.channel;
      const guild = interaction.guild;
      if (!channel || !guild) {
        return interaction.reply({ content: '⚠️ Channel not found.', ephemeral: true });
      }

      const ownerId = getTicketOwnerId(channel);
      if (!ownerId || interaction.user.id !== ownerId) {
        return interaction.reply({
          content: 'Only the ticket owner can choose this.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const data = getFeedbackContainer(client, guild.id, channel.id);
      data.wantsTranscript = interaction.customId === 'ticket_transcript_yes';

      await finalizeTicketClose(interaction, channel, client);
      return;
    }
  }
};
