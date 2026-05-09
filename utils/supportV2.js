const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder
} = require('discord.js');

const SUPPORT_PANEL_CHANNEL_ID = '1477251790713000088';
const SUPPORT_CATEGORY_ID = '1502554201916706826';
const SUPPORT_MODLOG_ID = '1355260778965373000';
const STAFF_ROLE_IDS = ['1405207645618700349', '1324536259439362089'];
const SUPPORT_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif?ex=68fa1f29&is=68f8cda9&hm=06e75e6659eff21a4e1cd2f3d4073b241c9e5e661ea85fdda42b6f8592ce0164';
const WELCOME_IMAGE_URL = 'https://magicui.design/og';
const MAGIC_UI_URL = 'https://magicui.design/';
const SUPPORT_URL = 'https://discord.com/channels/1151315619246002176/1477251790713000088';
const RULES_URL = 'https://discord.com/channels/1151315619246002176/1151318734158446623';

const V2_FLAGS = MessageFlags.IsComponentsV2;
const EPHEMERAL_V2_FLAGS = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;
const SILENT_MENTIONS = { parse: [] };

const EMOJIS = {
  check: { id: '1430525546608988203', name: 'check' },
  cross: { id: '1430525603701850165', name: 'cross' },
  support: { id: '1421840900258009129', name: 'techouse211' },
  rules: { id: '1421840914653122631', name: 'techouse210' },
  payment: { id: '1421842840899551332', name: 'techouse212' },
  bug: { id: '1421844306511007784', name: 'techouse213' },
  general: { id: '1421844303474462720', name: 'techouse214' },
  report: { id: '1421844300043387050', name: 'techouse215' },
  order: { id: '1421844296537083994', name: 'techouse216' },
  brand: { id: '1346947141570007060', name: '166878038' }
};

const EMOJI_TEXT = {
  check: '<:check:1430525546608988203>',
  cross: '<:cross:1430525603701850165>',
  support: '<:techouse211:1421840900258009129>',
  rules: '<:techouse210:1421840914653122631>',
  payment: '<:techouse212:1421842840899551332>',
  bug: '<:techouse213:1421844306511007784>',
  general: '<:techouse214:1421844303474462720>',
  report: '<:techouse215:1421844300043387050>',
  order: '<:techouse216:1421844296537083994>',
  brand: '<:166878038:1346947141570007060>'
};

const SUPPORT_REASONS = {
  billing: {
    label: 'Payment Report',
    emoji: EMOJIS.payment,
    emojiText: EMOJI_TEXT.payment,
    description: 'Billing, refunds, failed transactions, or receipt questions.'
  },
  bug: {
    label: 'Bug Report',
    emoji: EMOJIS.bug,
    emojiText: EMOJI_TEXT.bug,
    description: 'Broken components, visual bugs, errors, or regressions.'
  },
  issue: {
    label: 'Issue Report',
    emoji: EMOJIS.general,
    emojiText: EMOJI_TEXT.general,
    description: 'Setup, installation, access, or technical support issues.'
  },
  general: {
    label: 'General Support',
    emoji: EMOJIS.general,
    emojiText: EMOJI_TEXT.general,
    description: 'Questions that do not fit the other support reasons.'
  },
  rule: {
    label: 'Rule Violation',
    emoji: EMOJIS.report,
    emojiText: EMOJI_TEXT.report,
    description: 'Report a member, unsafe behavior, or server rule issue.'
  },
  order: {
    label: 'Order / Product Issue',
    emoji: EMOJIS.order,
    emojiText: EMOJI_TEXT.order,
    description: 'Product delivery, purchase access, or order problems.'
  }
};

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator(spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

function supportReason(type) {
  return SUPPORT_REASONS[type] || SUPPORT_REASONS.general;
}

function supportSelect() {
  return new StringSelectMenuBuilder()
    .setCustomId('ticket_reason_select')
    .setPlaceholder('Choose a support reason')
    .addOptions(
      ...Object.entries(SUPPORT_REASONS).map(([value, reason]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(reason.label)
          .setDescription(reason.description)
          .setValue(value)
          .setEmoji(reason.emoji)
      )
    );
}

function buttonRow(buttons) {
  return new ActionRowBuilder().addComponents(...buttons);
}

function buildSupportPanelComponents() {
  return [
    new ContainerBuilder()
      .setAccentColor(0x06072c)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.support} Welcome to MagicUI Support`),
        text('Welcome to the official Magic UI support desk. We are here to assist with design, code, billing, access, and technical problems related to Magic UI. Please choose the correct support reason below so the team can route your request properly and avoid unnecessary delays.')
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(SUPPORT_IMAGE_URL)
            .setDescription('Magic UI support artwork')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(
          [
            '### Rules & When To Open A Ticket',
            'Please read this before opening a ticket. Misuse of the support system may result in warnings or ticket restrictions.',
            '',
            `${EMOJI_TEXT.payment} Payment or billing issues`,
            `${EMOJI_TEXT.bug} Bug reports or broken components`,
            `${EMOJI_TEXT.general} Setup, installation, access, or general support`,
            `${EMOJI_TEXT.report} Rule violation or member reports`,
            `${EMOJI_TEXT.order} Order, license, or product issues`,
            '',
            'Do not open tickets for spam, repeated requests without new information, or feature suggestions that belong in the feedback channel.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text('### Open A Ticket\nSelect the closest reason from the menu below. The bot will ask for details and create a private ticket in the Magic UI support category.')
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(supportSelect()))
  ];
}

function buildSupportMenuComponents() {
  return [
    new ContainerBuilder()
      .setAccentColor(0x06072c)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.support} Magic UI Support`),
        text('Choose the closest reason from the menu below. The bot will ask for details and create a private ticket for you and the support team.')
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(supportSelect()))
  ];
}

function buildTicketOpenedComponents({ user, type, issueDetails, stepsTaken, extraNotes }) {
  const reason = supportReason(type);

  return [
    new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(
        text(`# ${reason.emojiText} Magic UI Support Ticket`),
        text(
          [
            `${user} opened a **${reason.label}** ticket.`,
            '',
            `Staff: ${STAFF_ROLE_IDS.map(roleId => `<@&${roleId}>`).join(' ')}`,
            '',
            'A staff member will review the information below. Please keep all related updates, screenshots, links, and follow-up context in this channel so the transcript stays useful.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(`### Issue Details\n${issueDetails}`),
        text(`### Steps Already Tried\n${stepsTaken}`),
        text(`### Additional Notes\n${extraNotes || 'N/A'}`)
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(SUPPORT_IMAGE_URL)
            .setDescription('Magic UI support artwork')
        )
      )
      .addActionRowComponents(
        buttonRow([
          new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(EMOJIS.check),
          new ButtonBuilder()
            .setCustomId('ticket_hold')
            .setLabel('Put On Hold')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.general),
          new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(EMOJIS.cross)
        ])
      )
  ];
}

function buildNoticeComponents(title, body, color = 0x2b2d31) {
  return [
    new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(text(`# ${title}`), text(body))
  ];
}

function buildCloseConfirmComponents() {
  return [
    new ContainerBuilder()
      .setAccentColor(0xfaa61a)
      .addTextDisplayComponents(
        text('# Confirm Ticket Close'),
        text('Are you sure you want to close this ticket? A transcript will be saved to the moderation log, and the ticket channel will be deleted shortly after confirmation.')
      )
      .addActionRowComponents(
        buttonRow([
          new ButtonBuilder()
            .setCustomId('ticket_close_confirm')
            .setLabel('Confirm Close')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('ticket_close_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        ])
      )
  ];
}

function buildLogComponents(title, body, color = 0x2b2d31, transcriptName = null) {
  const container = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(text(`# ${title}`), text(body));

  if (transcriptName) {
    container
      .addSeparatorComponents(separator())
      .addFileComponents(new FileBuilder().setURL(`attachment://${transcriptName}`));
  }

  return [container];
}

function buildWelcomeComponents() {
  return [
    new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addTextDisplayComponents(
        text(`# Welcome to ${EMOJI_TEXT.brand} Magic UI`),
        text(
          [
            'Start exploring with these key channels:',
            '',
            '- Rules & FAQs: https://discord.com/channels/1151315619246002176/1151318734158446623',
            '- FAQs: https://discord.com/channels/1151315619246002176/1383896107012063333',
            '- New Components & Releases: https://discord.com/channels/1151315619246002176/1151315620013551751',
            '- Showcase: https://discord.com/channels/1151315619246002176/1362409572165226596',
            '- Talk with others: https://discord.com/channels/1151315619246002176/1151315620013551755',
            '- Feedback: https://discord.com/channels/1151315619246002176/1426517448353517671',
            '',
            `${EMOJI_TEXT.rules} Need help? Jump to the support channel or use /support in the server.`
          ].join('\n')
        )
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(WELCOME_IMAGE_URL)
            .setDescription('Magic UI welcome artwork')
        )
      )
      .addActionRowComponents(
        buttonRow([
          new ButtonBuilder()
            .setLabel('Visit MagicUI')
            .setURL(MAGIC_UI_URL)
            .setStyle(ButtonStyle.Link)
            .setEmoji(EMOJIS.brand),
          new ButtonBuilder()
            .setLabel('Support')
            .setURL(SUPPORT_URL)
            .setStyle(ButtonStyle.Link)
            .setEmoji(EMOJIS.support),
          new ButtonBuilder()
            .setLabel('Rules')
            .setURL(RULES_URL)
            .setStyle(ButtonStyle.Link)
            .setEmoji(EMOJIS.rules)
        ])
      )
  ];
}

module.exports = {
  EMOJIS,
  EMOJI_TEXT,
  EPHEMERAL_V2_FLAGS,
  SILENT_MENTIONS,
  STAFF_ROLE_IDS,
  SUPPORT_CATEGORY_ID,
  SUPPORT_MODLOG_ID,
  SUPPORT_PANEL_CHANNEL_ID,
  V2_FLAGS,
  buildCloseConfirmComponents,
  buildLogComponents,
  buildNoticeComponents,
  buildSupportMenuComponents,
  buildSupportPanelComponents,
  buildTicketOpenedComponents,
  buildWelcomeComponents,
  supportReason
};
