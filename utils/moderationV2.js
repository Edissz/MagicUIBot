const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} = require('discord.js');

const MODERATION_CONFIG = {
  guildId: '1151315619246002176',
  modlogChannelId: '1355260778965373000',
  colors: {
    brand: 0x06072c,
    danger: 0xef4444,
    warning: 0xf59e0b,
    success: 0x22c55e,
    neutral: 0x2b2d31,
    info: 0x5865f2
  },
  links: {
    appeal: 'https://discord.com/channels/1151315619246002176/1477251790713000088',
    support: 'https://discord.com/channels/1151315619246002176/1477251790713000088',
    rules: 'https://discord.com/channels/1151315619246002176/1151318734158446623',
    faq: 'https://discord.com/channels/1151315619246002176/1383896107012063333',
    releases: 'https://discord.com/channels/1151315619246002176/1151315620013551751',
    showcase: 'https://discord.com/channels/1151315619246002176/1362409572165226596',
    community: 'https://discord.com/channels/1151315619246002176/1151315620013551755',
    feedback: 'https://discord.com/channels/1151315619246002176/1426517448353517671',
    site: 'https://magicui.design/'
  },
  artwork: {
    welcome: 'https://magicui.design/og',
    logo: 'https://magicui.design/icon.png'
  }
};

const EMOJIS = {
  check: { id: '1430525546608988203', name: 'check' },
  cross: { id: '1430525603701850165', name: 'cross' },
  brand: { id: '1346947141570007060', name: '166878038' },
  rules: { id: '1421840914653122631', name: 'techouse210' },
  support: { id: '1421840900258009129', name: 'techouse211' },
  payment: { id: '1421842840899551332', name: 'techouse212' },
  bug: { id: '1421844306511007784', name: 'techouse213' },
  general: { id: '1421844303474462720', name: 'techouse214' },
  moderation: { id: '1421844300043387050', name: 'techouse215' },
  order: { id: '1421844296537083994', name: 'techouse216' }
};

const EMOJI_TEXT = {
  check: '<:check:1430525546608988203>',
  cross: '<:cross:1430525603701850165>',
  brand: '<:166878038:1346947141570007060>',
  rules: '<:techouse210:1421840914653122631>',
  support: '<:techouse211:1421840900258009129>',
  payment: '<:techouse212:1421842840899551332>',
  bug: '<:techouse213:1421844306511007784>',
  general: '<:techouse214:1421844303474462720>',
  moderation: '<:techouse215:1421844300043387050>',
  order: '<:techouse216:1421844296537083994>'
};

const V2_FLAGS = MessageFlags.IsComponentsV2;
const SILENT_MENTIONS = { parse: [] };

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator(spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

function cleanText(value, maxLength = 1600, fallback = 'Not provided') {
  const cleaned = String(value || '')
    .trim()
    .replace(/@everyone/gi, '[everyone]')
    .replace(/@here/gi, '[here]');

  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

function lines(items) {
  return items.filter(Boolean).join('\n');
}

function actionLabel(action) {
  const value = String(action || '').toLowerCase();
  if (value === 'ban') return 'Ban';
  if (value === 'warn') return 'Warning';
  if (value === 'timeout') return 'Timeout';
  if (value === 'unban') return 'Unban';
  return action || 'Moderation Action';
}

function buildLinkRow(buttons) {
  return new ActionRowBuilder().addComponents(
    ...buttons.map(button =>
      new ButtonBuilder()
        .setLabel(button.label)
        .setURL(button.url)
        .setStyle(ButtonStyle.Link)
        .setEmoji(button.emoji)
    )
  );
}

function buildSimpleNoticeComponents({ title, body, color = MODERATION_CONFIG.colors.neutral }) {
  return [
    new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(text(`# ${title}`), text(body))
  ];
}

function buildModerationNoticeComponents({ action, caseNum, reason, duration }) {
  const label = actionLabel(action);
  const detailLines = [
    `Action: **${label}**`,
    caseNum ? `Case ID: **#${caseNum}**` : null,
    duration ? `Duration: **${duration}**` : null,
    `Reason: ${cleanText(reason, 800)}`
  ];

  return [
    new ContainerBuilder()
      .setAccentColor(MODERATION_CONFIG.colors.danger)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.moderation} Magic UI Moderation Notice`),
        text(
          [
            'You are receiving this notice because the Magic UI moderation team recorded an action on your account in the server. This message is meant to be clear, complete, and easy to reference later.',
            '',
            'Please review the details below carefully. If you believe the action was made in error, use the appeal button and provide context, evidence, and any relevant message links so the team can review it properly.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(text(lines(detailLines)))
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text('Appeals should stay respectful and specific. Repeated appeals without new information may slow down the review process.')
      )
      .addActionRowComponents(
        buildLinkRow([
          { label: 'Appeal / Support', url: MODERATION_CONFIG.links.appeal, emoji: EMOJIS.support },
          { label: 'Read Rules', url: MODERATION_CONFIG.links.rules, emoji: EMOJIS.rules }
        ])
      )
  ];
}

function buildModerationLogComponents({ action, userTag, userId, moderatorTag, moderatorId, reason, caseNum, duration }) {
  const label = actionLabel(action);

  return [
    new ContainerBuilder()
      .setAccentColor(action === 'unban' ? MODERATION_CONFIG.colors.success : MODERATION_CONFIG.colors.danger)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.moderation} Moderation Log`),
        text(
          lines([
            `Action: **${label}**`,
            `User: **${userTag || 'Unknown'}** (${userId || 'Unknown'})`,
            moderatorTag ? `Moderator: **${moderatorTag}** (${moderatorId})` : null,
            caseNum ? `Case ID: **#${caseNum}**` : null,
            duration ? `Duration: **${duration}**` : null,
            `Reason: ${cleanText(reason, 900)}`,
            `Date: <t:${Math.floor(Date.now() / 1000)}:F>`
          ])
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text('This entry was generated by the Magic UI V2 moderation system.'))
  ];
}

function buildWelcomeComponents(member) {
  return [
    new ContainerBuilder()
      .setAccentColor(MODERATION_CONFIG.colors.brand)
      .addTextDisplayComponents(
        text(`# Welcome to ${EMOJI_TEXT.brand} Magic UI`),
        text(
          [
            `Welcome, **${member.user.username}**. We are glad to have you in the Magic UI community.`,
            '',
            'Magic UI is a place for polished interface work, modern components, product ideas, templates, releases, feedback, and helpful technical discussion. Take a moment to read the rules and look through the important channels so your first visit feels organized instead of noisy.'
          ].join('\n')
        )
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(MODERATION_CONFIG.artwork.welcome)
            .setDescription('Magic UI welcome artwork')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(
          lines([
            `### Start Here`,
            `${EMOJI_TEXT.rules} Rules and FAQs: ${MODERATION_CONFIG.links.rules}`,
            `${EMOJI_TEXT.general} Community chat: ${MODERATION_CONFIG.links.community}`,
            `${EMOJI_TEXT.bug} New components and releases: ${MODERATION_CONFIG.links.releases}`,
            `${EMOJI_TEXT.order} Showcase: ${MODERATION_CONFIG.links.showcase}`,
            `${EMOJI_TEXT.support} Support: ${MODERATION_CONFIG.links.support}`,
            `${EMOJI_TEXT.payment} Feedback: ${MODERATION_CONFIG.links.feedback}`
          ])
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text('If you need help, use `/support` in the server or open the support channel. Choose the closest reason from the menu and include enough context for the team to help quickly.')
      )
      .addActionRowComponents(
        buildLinkRow([
          { label: 'Visit Magic UI', url: MODERATION_CONFIG.links.site, emoji: EMOJIS.brand },
          { label: 'Open Support', url: MODERATION_CONFIG.links.support, emoji: EMOJIS.support },
          { label: 'Read Rules', url: MODERATION_CONFIG.links.rules, emoji: EMOJIS.rules }
        ])
      )
  ];
}

function buildRoleUpdateComponents({ added, removed }) {
  return [
    new ContainerBuilder()
      .setAccentColor(MODERATION_CONFIG.colors.info)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.general} Magic UI Role Update`),
        text(
          [
            'Your server roles were updated in Magic UI. This may happen after verification, purchases, staff review, booster changes, or normal moderation and access maintenance.',
            '',
            'If something looks wrong, open a support ticket and include the roles you expected to have so the team can check it cleanly.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(`### Added Roles\n${added}`), text(`### Removed Roles\n${removed}`))
      .addActionRowComponents(
        buildLinkRow([{ label: 'Open Support', url: MODERATION_CONFIG.links.support, emoji: EMOJIS.support }])
      )
  ];
}

function buildRoleLogComponents({ userTag, userId, added, removed }) {
  return [
    new ContainerBuilder()
      .setAccentColor(MODERATION_CONFIG.colors.neutral)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.general} Role Change Log`),
        text(
          lines([
            `User: **${userTag}** (${userId})`,
            `Added Roles:\n${added}`,
            '',
            `Removed Roles:\n${removed}`,
            `Date: <t:${Math.floor(Date.now() / 1000)}:F>`
          ])
        )
      )
  ];
}

function buildSystemDmComponents({ moderatorTag, message, attachments = [] }) {
  const container = new ContainerBuilder()
    .setAccentColor(MODERATION_CONFIG.colors.info)
    .addTextDisplayComponents(
      text(`# ${EMOJI_TEXT.support} Message From Magic UI Staff`),
      text(
        [
          `A Magic UI staff member sent you the message below${moderatorTag ? ` on behalf of the team. Moderator: **${moderatorTag}**.` : '.'}`,
          '',
          cleanText(message, 1700, 'No written message was provided.'),
          '',
          'If this message seems suspicious or you believe it was sent by mistake, please contact server management through the support system.'
        ].join('\n')
      )
    )
    .addActionRowComponents(
      buildLinkRow([{ label: 'Open Support', url: MODERATION_CONFIG.links.support, emoji: EMOJIS.support }])
    );

  if (attachments.length) {
    const gallery = new MediaGalleryBuilder();
    for (const attachment of attachments.slice(0, 10)) {
      gallery.addItems(
        new MediaGalleryItemBuilder()
          .setURL(attachment.url)
          .setDescription(attachment.name || 'Magic UI staff attachment')
      );
    }
    container.addSeparatorComponents(separator()).addMediaGalleryComponents(gallery);
  }

  return [container];
}

function buildSystemDmLogComponents({ moderatorTag, moderatorId, userTag, userId, message }) {
  return [
    new ContainerBuilder()
      .setAccentColor(MODERATION_CONFIG.colors.info)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.support} System DM Sent`),
        text(
          lines([
            `Moderator: **${moderatorTag}** (${moderatorId})`,
            `User: **${userTag}** (${userId})`,
            `Message: ${cleanText(message, 1200, 'No written message provided.')}`,
            `Date: <t:${Math.floor(Date.now() / 1000)}:F>`
          ])
        )
      )
  ];
}

function buildCasesComponents({ targetTag, total, lastCases }) {
  return [
    new ContainerBuilder()
      .setAccentColor(MODERATION_CONFIG.colors.neutral)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.moderation} Cases For ${targetTag}`),
        text(
          lines([
            `Total cases: **${total}**`,
            '',
            lastCases || 'No cases are recorded for this member.'
          ])
        )
      )
  ];
}

module.exports = {
  EMOJIS,
  EMOJI_TEXT,
  MODERATION_CONFIG,
  SILENT_MENTIONS,
  V2_FLAGS,
  buildCasesComponents,
  buildModerationLogComponents,
  buildModerationNoticeComponents,
  buildRoleLogComponents,
  buildRoleUpdateComponents,
  buildSimpleNoticeComponents,
  buildSystemDmComponents,
  buildSystemDmLogComponents,
  buildWelcomeComponents
};
