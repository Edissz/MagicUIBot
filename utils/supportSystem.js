const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionsBitField,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThreadAutoArchiveDuration
} = require('discord.js');
const { saveTranscript } = require('./transcript');

const SUPPORT_CONFIG = {
  guildId: '1151315619246002176',
  panelChannelId: '1477251790713000088',
  categoryId: '1502554201916706826',
  modlogChannelId: '1355260778965373000',
  staffRoleIds: ['1405207645618700349', '1324536259439362089'],
  colors: {
    brand: 0x06072c,
    bug: 0xef4444,
    technical: 0x60a5fa,
    payment: 0xf59e0b,
    order: 0x2dd4bf,
    access: 0xa78bfa,
    report: 0xf97316,
    success: 0x22c55e,
    warning: 0xfaa61a,
    neutral: 0x2b2d31
  },
  links: {
    support: 'https://discord.com/channels/1151315619246002176/1477251790713000088',
    rules: 'https://discord.com/channels/1151315619246002176/1151318734158446623',
    feedback: 'https://discord.com/channels/1151315619246002176/1426517448353517671',
    site: 'https://magicui.design/'
  },
  artwork: {
    support: 'https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif?ex=68fa1f29&is=68f8cda9&hm=06e75e6659eff21a4e1cd2f3d4073b241c9e5e661ea85fdda42b6f8592ce0164',
    logo: 'https://magicui.design/icon.png'
  }
};

const EMOJIS = {
  check: { id: '1430525546608988203', name: 'check' },
  cross: { id: '1430525603701850165', name: 'cross' },
  support: { id: '1421840900258009129', name: 'techouse211' },
  access: { id: '1421840914653122631', name: 'techouse210' },
  payment: { id: '1421842840899551332', name: 'techouse212' },
  bug: { id: '1421844306511007784', name: 'techouse213' },
  technical: { id: '1421844303474462720', name: 'techouse214' },
  report: { id: '1421844300043387050', name: 'techouse215' },
  order: { id: '1421844296537083994', name: 'techouse216' }
};

const EMOJI_TEXT = {
  check: '<:check:1430525546608988203>',
  cross: '<:cross:1430525603701850165>',
  support: '<:techouse211:1421840900258009129>',
  access: '<:techouse210:1421840914653122631>',
  payment: '<:techouse212:1421842840899551332>',
  bug: '<:techouse213:1421844306511007784>',
  technical: '<:techouse214:1421844303474462720>',
  report: '<:techouse215:1421844300043387050>',
  order: '<:techouse216:1421844296537083994>'
};

const SUPPORT_REASONS = [
  {
    value: 'bug',
    label: 'Bug Report',
    channelLabel: 'bug',
    description: 'Broken components, visual issues, console errors, or regressions.',
    emoji: EMOJIS.bug,
    emojiText: EMOJI_TEXT.bug,
    color: SUPPORT_CONFIG.colors.bug
  },
  {
    value: 'technical',
    label: 'Technical Issue',
    channelLabel: 'issue',
    description: 'Installation, setup, framework, account, or integration help.',
    emoji: EMOJIS.technical,
    emojiText: EMOJI_TEXT.technical,
    color: SUPPORT_CONFIG.colors.technical
  },
  {
    value: 'payment',
    label: 'Payment Report',
    channelLabel: 'payment',
    description: 'Billing, failed payments, refunds, receipts, or order verification.',
    emoji: EMOJIS.payment,
    emojiText: EMOJI_TEXT.payment,
    color: SUPPORT_CONFIG.colors.payment
  },
  {
    value: 'order',
    label: 'Order / Product Support',
    channelLabel: 'order',
    description: 'Delivery, license access, product files, or purchase questions.',
    emoji: EMOJIS.order,
    emojiText: EMOJI_TEXT.order,
    color: SUPPORT_CONFIG.colors.order
  },
  {
    value: 'access',
    label: 'Account / Access Help',
    channelLabel: 'access',
    description: 'Roles, private channels, dashboard access, or member verification.',
    emoji: EMOJIS.access,
    emojiText: EMOJI_TEXT.access,
    color: SUPPORT_CONFIG.colors.access
  },
  {
    value: 'report',
    label: 'Member / Rule Report',
    channelLabel: 'report',
    description: 'Report unsafe behavior, impersonation, scams, or rule violations.',
    emoji: EMOJIS.report,
    emojiText: EMOJI_TEXT.report,
    color: SUPPORT_CONFIG.colors.report
  }
];

const V2_FLAGS = MessageFlags.IsComponentsV2;
const EPHEMERAL_V2_FLAGS = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;
const SILENT_MENTIONS = { parse: [] };

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator(spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

function reasonMeta(value) {
  return SUPPORT_REASONS.find(reason => reason.value === value) || SUPPORT_REASONS[1];
}

function cleanText(value, maxLength = 1800, fallback = 'Not provided') {
  const cleaned = String(value || '')
    .trim()
    .replace(/@everyone/gi, '[everyone]')
    .replace(/@here/gi, '[here]');

  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

function fieldValue(fields, ids, fallback = '') {
  for (const id of ids) {
    try {
      const value = fields.getTextInputValue(id);
      if (value) return value;
    } catch {}
  }

  return fallback;
}

function sanitizeName(value) {
  return String(value || 'member')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 20) || 'member';
}

function ticketBaseName(channelName) {
  return channelName.replace(/^(open|claimed|hold|closed)-/i, '').slice(0, 85);
}

function buildSupportSelect(customId = 'support_reason_select') {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('Choose the closest support reason')
    .addOptions(
      ...SUPPORT_REASONS.map(reason =>
        new StringSelectMenuOptionBuilder()
          .setLabel(reason.label)
          .setDescription(reason.description)
          .setValue(reason.value)
          .setEmoji(reason.emoji)
      )
    );
}

function buildSupportMenuComponents({ privateMenu = false } = {}) {
  const intro = privateMenu
    ? 'This private support menu will open a dedicated ticket for you. Select the reason that best matches what you need, then include enough detail for the team to reproduce, verify, or resolve the request without guessing.'
    : 'Welcome to the official Magic UI support desk. This panel is for issues that need direct staff attention: payment questions, product access, component bugs, account issues, and reports that should not be handled in public chat.';

  return [
    new ContainerBuilder()
      .setAccentColor(SUPPORT_CONFIG.colors.brand)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.support} Magic UI Support`),
        text(
          [
            intro,
            '',
            'A good ticket saves everyone time. Please choose the closest category and write a clear paragraph explaining what happened, what you expected to happen, and any order IDs, screenshots, console errors, links, or reproduction steps that may help staff review it properly.'
          ].join('\n')
        )
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(SUPPORT_CONFIG.artwork.support)
            .setDescription('Magic UI support artwork')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(
          [
            '### Before You Open A Ticket',
            `${EMOJI_TEXT.payment} Payment and order reports should include the payment method, approximate purchase time, and receipt or transaction reference when available.`,
            `${EMOJI_TEXT.bug} Bug reports should include the affected component, browser/framework version, reproduction steps, and screenshots or logs.`,
            `${EMOJI_TEXT.report} Member reports should include message links, user IDs, and a concise summary of the concern.`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text('### Open Support\nSelect a reason below. A private ticket channel will be created in the support category for you and the Magic UI team.'))
      .addActionRowComponents(new ActionRowBuilder().addComponents(buildSupportSelect()))
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(`${EMOJI_TEXT.check} Please keep one issue per ticket so staff can keep the resolution clean and easy to track.`))
  ];
}

function buildSupportModal(reasonValue) {
  const reason = reasonMeta(reasonValue);
  const modal = new ModalBuilder()
    .setCustomId(`support_ticket_modal_${reason.value}`)
    .setTitle(`${reason.label} Details`);

  const summary = new TextInputBuilder()
    .setCustomId('summary')
    .setLabel('Short summary')
    .setPlaceholder('Example: Payment completed, but I do not have access yet.')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(120);

  const details = new TextInputBuilder()
    .setCustomId('details')
    .setLabel('Detailed explanation')
    .setPlaceholder('Write the full context, what happened, what you expected, and what you need the team to review.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800);

  const evidence = new TextInputBuilder()
    .setCustomId('evidence')
    .setLabel('Links, screenshots, or evidence')
    .setPlaceholder('Message links, image links, console logs, order URLs, or N/A.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000);

  const reference = new TextInputBuilder()
    .setCustomId('reference')
    .setLabel('Order ID / account / component')
    .setPlaceholder('Order ID, Discord username, component name, package, or N/A.')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(250);

  modal.addComponents(
    new ActionRowBuilder().addComponents(summary),
    new ActionRowBuilder().addComponents(details),
    new ActionRowBuilder().addComponents(evidence),
    new ActionRowBuilder().addComponents(reference)
  );

  return modal;
}

function buildNoticeComponents({ title, body, color = SUPPORT_CONFIG.colors.neutral, footer }) {
  const container = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(text(`# ${title}`), text(body));

  if (footer) {
    container.addSeparatorComponents(separator()).addTextDisplayComponents(text(footer));
  }

  return [container];
}

function buildTicketOpenComponents({ channel, opener, reason, summary, details, evidence, reference }) {
  return [
    new ContainerBuilder()
      .setAccentColor(reason.color)
      .addTextDisplayComponents(
        text(`# ${reason.emojiText} ${reason.label}`),
        text(
          [
            `${opener} opened a Magic UI support ticket for **${reason.label}**.`,
            '',
            'Staff should review the details below, ask focused follow-up questions, and keep the member updated if the request needs investigation. Please avoid unnecessary pings and keep all relevant context in this channel so the transcript remains useful.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(`### Summary\n${summary}`),
        text(`### Detailed Explanation\n${details}`),
        text(`### Evidence / Links\n${evidence}`),
        text(`### Reference\n${reference}`)
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(
          [
            `Ticket channel: ${channel}`,
            `Opened: <t:${Math.floor(Date.now() / 1000)}:F>`,
            `Staff roles: ${SUPPORT_CONFIG.staffRoleIds.map(roleId => `<@&${roleId}>`).join(' ')}`
          ].join('\n')
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('support_ticket_claim')
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(EMOJIS.check),
          new ButtonBuilder()
            .setCustomId('support_ticket_hold')
            .setLabel('Put On Hold')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.technical),
          new ButtonBuilder()
            .setCustomId('support_ticket_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(EMOJIS.cross)
        )
      )
  ];
}

function buildTicketStatusComponents({ title, body, color = SUPPORT_CONFIG.colors.neutral }) {
  return [
    new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(text(`# ${title}`), text(body))
  ];
}

function buildCloseConfirmationComponents(channel) {
  return [
    new ContainerBuilder()
      .setAccentColor(SUPPORT_CONFIG.colors.warning)
      .addTextDisplayComponents(
        text('# Confirm Ticket Closure'),
        text(
          [
            `You are about to close ${channel}.`,
            'A transcript will be generated for the moderation log and the ticket channel will be deleted shortly after confirmation. Only confirm once the member has been helped or staff has decided the ticket should be archived.'
          ].join('\n\n')
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('support_ticket_close_confirm')
            .setLabel('Confirm Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(EMOJIS.cross),
          new ButtonBuilder()
            .setCustomId('support_ticket_close_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  ];
}

function buildTicketLogComponents({ title, body, color = SUPPORT_CONFIG.colors.neutral, transcriptName }) {
  const container = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(text(`# ${title}`), text(body));

  if (transcriptName) {
    container
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text('Transcript attached below.'))
      .addFileComponents(new FileBuilder().setURL(`attachment://${transcriptName}`));
  }

  return [container];
}

function isSupportStaff(member) {
  if (!member) return false;
  return (
    member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
    member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
    SUPPORT_CONFIG.staffRoleIds.some(roleId => member.roles.cache.has(roleId))
  );
}

function getTicketOwnerId(channel) {
  return channel?.topic?.match(/ticket-owner:(\d+)/)?.[1] || null;
}

function findExistingTicket(guild, userId) {
  return guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildText &&
    channel.parentId === SUPPORT_CONFIG.categoryId &&
    channel.topic?.includes(`ticket-owner:${userId}`) &&
    !channel.name.startsWith('closed-')
  ) || null;
}

async function sendSupportPanel(guild) {
  const targetChannel = await guild.channels.fetch(SUPPORT_CONFIG.panelChannelId).catch(() => null);
  if (!targetChannel || !targetChannel.isTextBased()) {
    throw new Error('Support panel channel not found.');
  }

  return targetChannel.send({
    components: buildSupportMenuComponents(),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });
}

async function handleSupportSlashCommand(interaction) {
  return interaction.reply({
    components: buildSupportMenuComponents({ privateMenu: true }),
    flags: EPHEMERAL_V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });
}

async function handleTicketModal(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const reasonValue = interaction.customId.replace('support_ticket_modal_', '').replace('ticket_modal_', '');
  const reason = reasonMeta(reasonValue);
  const summary = cleanText(fieldValue(interaction.fields, ['summary'], reason.label), 120);
  const details = cleanText(fieldValue(interaction.fields, ['details', 'issue_details']), 1800);
  const evidence = cleanText(fieldValue(interaction.fields, ['evidence', 'steps_taken']), 1000, 'Not provided');
  const reference = cleanText(fieldValue(interaction.fields, ['reference', 'extra_notes']), 250, 'Not provided');
  const existing = findExistingTicket(interaction.guild, interaction.user.id);

  if (existing) {
    return interaction.editReply({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.support} Existing Ticket Found`,
        body: `You already have an open support ticket: ${existing}. Please continue there so staff can keep your request in one place.`,
        color: SUPPORT_CONFIG.colors.warning
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  const parent = await interaction.guild.channels.fetch(SUPPORT_CONFIG.categoryId).catch(() => null);
  if (!parent || parent.type !== ChannelType.GuildCategory) {
    return interaction.editReply({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.cross} Support Category Missing`,
        body: 'The configured support category could not be found. Please contact an administrator so the ticket system can be repaired.',
        color: SUPPORT_CONFIG.colors.report
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  const nameBase = sanitizeName(interaction.user.username);
  const channelName = `open-${reason.channelLabel}-${nameBase}`.slice(0, 95);
  const permissionOverwrites = [
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
    ...SUPPORT_CONFIG.staffRoleIds.map(roleId => ({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ManageChannels
      ]
    }))
  ];

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: SUPPORT_CONFIG.categoryId,
    topic: `Magic UI support ticket | ticket-owner:${interaction.user.id} | reason:${reason.value}`,
    permissionOverwrites,
    reason: `Support ticket created by ${interaction.user.tag} (${interaction.user.id})`
  });

  await channel.send({
    components: buildTicketOpenComponents({
      channel,
      opener: interaction.user,
      reason,
      summary,
      details,
      evidence,
      reference
    }),
    flags: V2_FLAGS,
    allowedMentions: {
      users: [interaction.user.id],
      roles: SUPPORT_CONFIG.staffRoleIds
    }
  });

  const thread = await channel.threads.create({
    name: `staff-notes-${reason.channelLabel}-${nameBase}`.slice(0, 95),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    type: ChannelType.PrivateThread,
    invitable: false,
    reason: 'Private staff notes for support ticket'
  }).catch(() => null);

  if (thread) {
    await thread.members.add(client.user.id).catch(() => null);
    await thread.send({
      components: buildTicketStatusComponents({
        title: `${EMOJI_TEXT.support} Staff Notes`,
        body: 'Use this private thread for staff-only context, internal checks, and resolution notes that should not be posted directly in the member-facing ticket channel.',
        color: SUPPORT_CONFIG.colors.neutral
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    }).catch(() => null);
  }

  const modlog = interaction.guild.channels.cache.get(SUPPORT_CONFIG.modlogChannelId);
  if (modlog) {
    await modlog.send({
      components: buildTicketLogComponents({
        title: `${EMOJI_TEXT.support} Ticket Created`,
        body: [
          `User: ${interaction.user.tag} (${interaction.user.id})`,
          `Channel: ${channel} (${channel.id})`,
          `Reason: ${reason.label}`,
          `Summary: ${summary}`,
          `Created: <t:${Math.floor(Date.now() / 1000)}:F>`
        ].join('\n'),
        color: reason.color
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    }).catch(() => null);
  }

  await interaction.user.send({
    components: buildNoticeComponents({
      title: `${EMOJI_TEXT.check} Support Ticket Created`,
      body: `Your Magic UI support ticket has been created: ${channel}. A staff member will review your request as soon as possible. Please keep all follow-up details in that ticket so the conversation stays organized.`,
      color: SUPPORT_CONFIG.colors.success
    }),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  }).catch(() => null);

  return interaction.editReply({
    components: buildNoticeComponents({
      title: `${EMOJI_TEXT.check} Ticket Opened`,
      body: `Your support ticket is ready: ${channel}. Staff have been notified, and your details were posted in the ticket channel.`,
      color: SUPPORT_CONFIG.colors.success
    }),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });
}

async function handleTicketAction(interaction) {
  if (!isSupportStaff(interaction.member)) {
    return interaction.reply({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.cross} Staff Only`,
        body: 'Only Magic UI staff can use ticket controls.',
        color: SUPPORT_CONFIG.colors.report
      }),
      flags: EPHEMERAL_V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText || channel.parentId !== SUPPORT_CONFIG.categoryId) {
    return interaction.reply({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.cross} Invalid Ticket Channel`,
        body: 'This control can only be used inside a Magic UI support ticket channel.',
        color: SUPPORT_CONFIG.colors.report
      }),
      flags: EPHEMERAL_V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  if (interaction.customId === 'support_ticket_claim' || interaction.customId === 'ticket_claim') {
    await channel.setName(`claimed-${ticketBaseName(channel.name)}`.slice(0, 95)).catch(() => null);
    await channel.send({
      components: buildTicketStatusComponents({
        title: `${EMOJI_TEXT.check} Ticket Claimed`,
        body: `${interaction.user} has claimed this ticket and will coordinate the next response. If another staff member needs to assist, please keep the handoff visible in this channel.`,
        color: SUPPORT_CONFIG.colors.success
      }),
      flags: V2_FLAGS,
      allowedMentions: { users: [interaction.user.id] }
    });

    return interaction.reply({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.check} Ticket Claimed`,
        body: `You claimed ${channel}.`,
        color: SUPPORT_CONFIG.colors.success
      }),
      flags: EPHEMERAL_V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  if (interaction.customId === 'support_ticket_hold' || interaction.customId === 'ticket_hold') {
    await channel.setName(`hold-${ticketBaseName(channel.name)}`.slice(0, 95)).catch(() => null);
    await channel.send({
      components: buildTicketStatusComponents({
        title: `${EMOJI_TEXT.technical} Ticket On Hold`,
        body: `${interaction.user} placed this ticket on hold. The team may be checking payment records, reproducing a bug, waiting for a response, or coordinating internally before the next update.`,
        color: SUPPORT_CONFIG.colors.warning
      }),
      flags: V2_FLAGS,
      allowedMentions: { users: [interaction.user.id] }
    });

    return interaction.reply({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.check} Ticket Updated`,
        body: `${channel} has been marked as on hold.`,
        color: SUPPORT_CONFIG.colors.warning
      }),
      flags: EPHEMERAL_V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  if (interaction.customId === 'support_ticket_close' || interaction.customId === 'ticket_close') {
    return interaction.reply({
      components: buildCloseConfirmationComponents(channel),
      flags: EPHEMERAL_V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  return null;
}

async function handleTicketCloseDecision(interaction) {
  const channel = interaction.channel;

  if (interaction.customId === 'support_ticket_close_cancel' || interaction.customId === 'ticket_close_cancel') {
    return interaction.update({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.check} Closure Cancelled`,
        body: 'The ticket was left open.',
        color: SUPPORT_CONFIG.colors.neutral
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.update({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.cross} Channel Missing`,
        body: 'The ticket channel could not be found.',
        color: SUPPORT_CONFIG.colors.report
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  if (!isSupportStaff(interaction.member)) {
    return interaction.update({
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.cross} Staff Only`,
        body: 'Only Magic UI staff can close tickets.',
        color: SUPPORT_CONFIG.colors.report
      }),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
  }

  await interaction.deferUpdate();
  await channel.setName(`closed-${ticketBaseName(channel.name)}`.slice(0, 95)).catch(() => null);

  await channel.send({
    components: buildTicketStatusComponents({
      title: `${EMOJI_TEXT.check} Ticket Closed`,
      body: `${interaction.user} closed this support ticket. A transcript is being saved to the moderation log, and this channel will be deleted shortly.`,
      color: SUPPORT_CONFIG.colors.success
    }),
    flags: V2_FLAGS,
    allowedMentions: { users: [interaction.user.id] }
  }).catch(() => null);

  const transcript = await saveTranscript(channel);
  const transcriptName = `transcript-${channel.id}.txt`;
  const transcriptFile = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: transcriptName });
  const ownerId = getTicketOwnerId(channel);
  const modlog = interaction.guild.channels.cache.get(SUPPORT_CONFIG.modlogChannelId);

  if (modlog) {
    await modlog.send({
      components: buildTicketLogComponents({
        title: `${EMOJI_TEXT.check} Ticket Closed`,
        body: [
          `Channel: #${channel.name} (${channel.id})`,
          `Opened by: ${ownerId ? `<@${ownerId}> (${ownerId})` : 'Unknown'}`,
          `Closed by: ${interaction.user.tag} (${interaction.user.id})`,
          `Closed: <t:${Math.floor(Date.now() / 1000)}:F>`
        ].join('\n'),
        color: SUPPORT_CONFIG.colors.success,
        transcriptName
      }),
      files: [transcriptFile],
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    }).catch(() => null);
  }

  await interaction.editReply({
    components: buildNoticeComponents({
      title: `${EMOJI_TEXT.check} Ticket Archived`,
      body: 'The transcript was saved and the channel will be deleted in a few seconds.',
      color: SUPPORT_CONFIG.colors.success
    }),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });

  setTimeout(async () => {
    await channel.delete('Support ticket closed and archived').catch(err => {
      console.error('Failed to delete support ticket channel:', err);
    });
  }, 7000);
}

async function handleSupportInteraction(interaction, client) {
  try {
    if (!interaction.guild) return;

    if (interaction.isChatInputCommand() && interaction.commandName === 'support') {
      return handleSupportSlashCommand(interaction);
    }

    if (
      interaction.isStringSelectMenu() &&
      (interaction.customId === 'support_reason_select' || interaction.customId === 'ticket_reason_select')
    ) {
      return interaction.showModal(buildSupportModal(interaction.values[0]));
    }

    if (
      interaction.isModalSubmit() &&
      (interaction.customId.startsWith('support_ticket_modal_') || interaction.customId.startsWith('ticket_modal_'))
    ) {
      return handleTicketModal(interaction, client);
    }

    if (
      interaction.isButton() &&
      ['support_ticket_claim', 'support_ticket_hold', 'support_ticket_close', 'ticket_claim', 'ticket_hold', 'ticket_close'].includes(interaction.customId)
    ) {
      return handleTicketAction(interaction);
    }

    if (
      interaction.isButton() &&
      ['support_ticket_close_confirm', 'support_ticket_close_cancel', 'ticket_close_confirm', 'ticket_close_cancel'].includes(interaction.customId)
    ) {
      return handleTicketCloseDecision(interaction);
    }
  } catch (err) {
    console.error('Support interaction failed:', err);

    const payload = {
      components: buildNoticeComponents({
        title: `${EMOJI_TEXT.cross} Support Error`,
        body: 'Something went wrong while handling that support action. Please try again or contact an administrator.',
        color: SUPPORT_CONFIG.colors.report
      }),
      flags: interaction.deferred || interaction.replied ? V2_FLAGS : EPHEMERAL_V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    };

    if (interaction.deferred || interaction.replied) return interaction.editReply(payload).catch(() => null);
    return interaction.reply(payload).catch(() => null);
  }
}

module.exports = {
  EMOJIS,
  EMOJI_TEXT,
  EPHEMERAL_V2_FLAGS,
  SILENT_MENTIONS,
  SUPPORT_CONFIG,
  SUPPORT_REASONS,
  V2_FLAGS,
  buildNoticeComponents,
  buildSupportMenuComponents,
  handleSupportInteraction,
  handleSupportSlashCommand,
  sendSupportPanel
};
