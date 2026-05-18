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

const GUILD_ID = '1151315619246002176';
const SUPPORT_PANEL_CHANNEL_ID = '1477251790713000088';
const SUPPORT_CATEGORY_ID = '1502554201916706826';
const SUPPORT_MODLOG_ID = '1355260778965373000';
const VERIFIED_ROLE_ID = '1505968642452492509';
const STAFF_ROLE_IDS = ['1405207645618700349', '1324536259439362089'];
const ROLE_RESTORE_EXCLUDED_ROLE_IDS = [...STAFF_ROLE_IDS];

const SUPPORT_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif?ex=68fa1f29&is=68f8cda9&hm=06e75e6659eff21a4e1cd2f3d4073b241c9e5e661ea85fdda42b6f8592ce0164';
const WELCOME_IMAGE_URL = 'https://magicui.design/og';
const MAGIC_UI_URL = 'https://magicui.design/';
const RULES_URL = 'https://discord.com/channels/1151315619246002176/1151318734158446623';
const SUPPORT_BOT_MENTION = '<@1430212769973670092>';

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
  brand: { id: '1346947141570007060', name: 'MagicUI' },
  star: { id: '1501563855539535882', name: 'starbulkrounded' },
  mail: { id: '1501564351763710137', name: 'mailaccount02bulkrounded' }
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
  brand: '<:MagicUI:1346947141570007060>',
  star: '<:starbulkrounded:1501563855539535882>',
  mail: '<:mailaccount02bulkrounded:1501564351763710137>'
};

const SUPPORT_REASONS = {
  billing: {
    label: 'Billing & Payments',
    emojiText: EMOJI_TEXT.payment,
    description: 'Billing, refunds, failed transactions, or receipt questions.'
  },
  bug: {
    label: 'Bug or Component Issue',
    emojiText: EMOJI_TEXT.bug,
    description: 'Broken components, visual bugs, errors, or regressions.'
  },
  issue: {
    label: 'Technical Support',
    emojiText: EMOJI_TEXT.general,
    description: 'Setup, installation, access, or technical support issues.'
  },
  appeal: {
    label: 'Moderation Appeal',
    emojiText: EMOJI_TEXT.rules,
    description: 'Ask about a warning, timeout, removed content, or appeal.'
  },
  rule: {
    label: 'Report a Member',
    emojiText: EMOJI_TEXT.report,
    description: 'Report a member, unsafe behavior, or server rule issue.'
  },
  order: {
    label: 'Order or Product Access',
    emojiText: EMOJI_TEXT.order,
    description: 'Product delivery, purchase access, or order problems.'
  },
  general: {
    label: 'General Support',
    emojiText: EMOJI_TEXT.general,
    description: 'Questions that do not fit the other support reasons.'
  }
};

function text(content) {
  return new TextDisplayBuilder().setContent(String(content).slice(0, 4000));
}

function separator(spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

function buttonRow(buttons) {
  return new ActionRowBuilder().addComponents(...buttons);
}

function supportReason(type) {
  return SUPPORT_REASONS[type] || SUPPORT_REASONS.general;
}

function safe(value, fallback = 'Not provided') {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
}

function limitedLines(lines, max = 12) {
  if (!lines.length) return 'None';
  const visible = lines.slice(0, max);
  const hidden = lines.length - visible.length;
  return `${visible.join('\n')}${hidden > 0 ? `\n...and ${hidden} more` : ''}`;
}

function supportSelect() {
  return new StringSelectMenuBuilder()
    .setCustomId('ticket_reason_select')
    .setPlaceholder('Select what you need help with')
    .addOptions(
      ...Object.entries(SUPPORT_REASONS).map(([value, reason]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(reason.label)
          .setDescription(reason.description)
          .setValue(value)
      )
    );
}

function buildSupportPanelComponents() {
  return [
    new ContainerBuilder()
      .setAccentColor(0x06072c)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.support} Magic UI Support Center`),
        text('Choose the topic that best matches your request. The bot will collect the right details and open a private ticket for you and the Magic UI team.')
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
            '### Before Opening A Ticket',
            'Use tickets for billing, product access, technical issues, moderation questions, reports, and urgent account concerns.',
            '',
            `${EMOJI_TEXT.payment} Payment, billing, refunds, or receipts`,
            `${EMOJI_TEXT.bug} Bug reports or broken components`,
            `${EMOJI_TEXT.general} Setup, installation, access, or general support`,
            `${EMOJI_TEXT.rules} Warning, timeout, removed content, or appeal questions`,
            `${EMOJI_TEXT.report} Rule violations, member reports, or unsafe behavior`,
            `${EMOJI_TEXT.order} Order, license, or product access issues`,
            '',
            'Please include screenshots, links, account details, and steps already tried when the form asks for them.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text('### Open A Ticket\nSelect a reason from the menu. The bot will ask for details and create a private channel in the Magic UI support category.')
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(supportSelect()))
  ];
}

function buildSupportMenuComponents() {
  return [
    new ContainerBuilder()
      .setAccentColor(0x06072c)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.support} Magic UI Support Center`),
        text('Select the topic that best fits your request. After the short form, I will create a private ticket in the support category.')
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(supportSelect()))
  ];
}

function buildTicketOpenedComponents({ user, type, issueDetails, stepsTaken, extraNotes, createdAt = Date.now(), staffRoleIds = STAFF_ROLE_IDS }) {
  const reason = supportReason(type);
  const timestamp = Math.floor(createdAt / 1000);
  const staffLine = staffRoleIds.length
    ? staffRoleIds.map(roleId => `<@&${roleId}>`).join(' ')
    : 'Staff team';

  return [
    new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(
        text(`# ${reason.emojiText} Magic UI Support Ticket`),
        text(
          [
            `${user} opened a **${reason.label}** ticket.`,
            '',
            `**Opened:** <t:${timestamp}:F>`,
            `**Staff:** ${staffLine}`,
            '',
            'A staff member will review the form below. Keep screenshots, links, and follow-up context in this channel so the transcript stays useful.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(`### Issue Details\n${safe(issueDetails)}`),
        text(`### Steps Already Tried\n${safe(stepsTaken)}`),
        text(`### Additional Notes\n${safe(extraNotes, 'N/A')}`)
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
            .setLabel('Claim')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('ticket_resolve')
            .setLabel('Resolve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('ticket_hold')
            .setLabel('Hold')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ticket_transcript')
            .setLabel('Transcript')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
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

function buildWelcomeComponents(user) {
  const userLabel = user ? `${user}` : '{user}';

  return [
    new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addTextDisplayComponents(
        text(`# Welcome to ${EMOJI_TEXT.brand} Magic UI, ${userLabel}`),
        text(
          [
            '**Design Engineer Community**',
            '',
            `${EMOJI_TEXT.star} Start exploring with these key channels:`,
            '',
            '> * **Rules & FAQs:** https://discord.com/channels/1151315619246002176/1151318734158446623',
            '> * **New Components & Releases:** https://discord.com/channels/1151315619246002176/1151315620013551751',
            '> * **Showcase:** https://discord.com/channels/1151315619246002176/1362409572165226596',
            '> * **Talk with Others:** https://discord.com/channels/1151315619246002176/1151315620013551755',
            '> * **Job Board:** https://discord.com/channels/1151315619246002176/1501531376581742622',
            '',
            `${EMOJI_TEXT.mail} Need help? Jump into the server and use the \`/support\` command with the official ${SUPPORT_BOT_MENTION} bot.`
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
            .setLabel('Visit Magic UI')
            .setURL(MAGIC_UI_URL)
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Rules')
            .setURL(RULES_URL)
            .setStyle(ButtonStyle.Link)
        ])
      )
  ];
}

function buildRoleUpdateComponents({ addedRoles = [], removedRoles = [], guildName = 'Magic UI' }) {
  const added = limitedLines(addedRoles.map(role => `+ ${role.name}`));
  const removed = limitedLines(removedRoles.map(role => `- ${role.name}`));

  return [
    new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        text('# Role Update Notification'),
        text(
          [
            `Your roles in **${guildName}** were updated.`,
            '',
            '### Added Roles',
            added,
            '',
            '### Removed Roles',
            removed,
            '',
            'If this looks unexpected, use `/support` in the server and the Magic UI team can review it.'
          ].join('\n')
        )
      )
  ];
}

function buildRoleLogComponents({ member, addedRoles = [], removedRoles = [] }) {
  const added = limitedLines(addedRoles.map(role => `+ <@&${role.id}> (${role.id})`));
  const removed = limitedLines(removedRoles.map(role => `- <@&${role.id}> (${role.id})`));

  return buildLogComponents(
    'Role Change Log',
    [
      `User: ${member.user.tag} (${member.id})`,
      `Time: <t:${Math.floor(Date.now() / 1000)}:F>`,
      '',
      'Added Roles:',
      added,
      '',
      'Removed Roles:',
      removed
    ].join('\n'),
    0x5865f2
  );
}

function buildRoleRestoreOfferComponents({ guildId, savedAt, roleNames = [] }) {
  const savedTimestamp = Math.floor(new Date(savedAt).getTime() / 1000);
  const roles = limitedLines(roleNames.map(name => `- ${name}`), 16);

  return [
    new ContainerBuilder()
      .setAccentColor(0x22c55e)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.check} Restore Previous Roles?`),
        text(
          [
            'Welcome back to Magic UI. I found a saved role snapshot from your previous server membership.',
            '',
            `**Saved:** <t:${savedTimestamp}:F>`,
            '',
            '### Restorable Roles',
            roles,
            '',
            'Only non-staff, non-admin roles that still exist and can be safely managed by the bot will be restored.'
          ].join('\n')
        )
      )
      .addActionRowComponents(
        buttonRow([
          new ButtonBuilder()
            .setCustomId(`role_restore_accept_${guildId}`)
            .setLabel('Yes, restore roles')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`role_restore_decline_${guildId}`)
            .setLabel('No, thanks')
            .setStyle(ButtonStyle.Secondary)
        ])
      )
  ];
}

function buildRoleRestoreResultComponents(title, body, color = 0x22c55e) {
  return buildNoticeComponents(title, body, color);
}

function buildBanNoticeComponents({ caseId, reason, moderatorTag, timestamp = Math.floor(Date.now() / 1000) }) {
  return [
    new ContainerBuilder()
      .setAccentColor(0xef4444)
      .addTextDisplayComponents(
        text('# Ban Notice'),
        text(
          [
            'You have been banned from Magic UI.',
            '',
            `**Action:** Ban`,
            `**Case ID:** #${caseId}`,
            `**Reason:** ${safe(reason)}`,
            `**Issued by:** ${safe(moderatorTag)}`,
            `**Date:** <t:${timestamp}:F>`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(
          [
            '### Why bans happen',
            'This server follows Discord Community Guidelines and Magic UI policies. A ban may occur for any of the following:',
            '',
            '**Conduct**',
            '- Hate speech, harassment, discrimination, threats, or targeted abuse',
            '- Trolling, baiting, toxic behavior, or starting or dragging drama',
            '- Spamming, flooding, mass mentions, repeated disruptions',
            '- Ignoring moderator instructions or arguing moderation decisions',
            '- Misusing channels or repeatedly going off-topic'
          ].join('\n')
        ),
        text(
          [
            '**Content standards**',
            '- Posting NSFW, offensive, violent, or unsafe content',
            '- Sharing misleading content, impersonation, or false claims',
            '- Failing to credit creators or misrepresenting AI-assisted work',
            '',
            '**Originality & licensing**',
            '- Plagiarism or copying designs, code, or assets without permission',
            '- Violating software or content licenses or removing required attribution'
          ].join('\n')
        ),
        text(
          [
            '**Promotion & advertising**',
            '- Posting invite, referral, or affiliate links',
            '- Unapproved paid promotions',
            '- Unsolicited advertising or private promotions, including DMs',
            '',
            '**Privacy & safety**',
            '- Sharing personal, private, or sensitive information',
            '- Phishing, scams, malware, or malicious or unsafe links',
            '- Attempts to compromise accounts, services, or security'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(
          [
            '### Appeal status',
            'Appeals are not available for this ban.',
            'Do not attempt to bypass this action using alternate accounts or by contacting staff privately.',
            '',
            'Magic UI Moderation Team'
          ].join('\n')
        )
      )
  ];
}

function buildWarningNoticeComponents({ caseId, reason, moderatorTag, timestamp = Math.floor(Date.now() / 1000) }) {
  return [
    new ContainerBuilder()
      .setAccentColor(0xfaa61a)
      .addTextDisplayComponents(
        text('# Moderation Notice'),
        text(
          [
            'Hi there, just a quick heads-up from the Magic UI moderation team.',
            '',
            `**Action:** Warning`,
            `**Case ID:** #${caseId}`,
            `**Reason:** ${safe(reason)}`,
            `**Issued by:** ${safe(moderatorTag)}`,
            `**Date:** <t:${timestamp}:F>`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(
          [
            '### You may have been warned for things like:',
            '- Harassment, insults, or targeted negativity',
            '- Spamming, flooding, or disruptive messages',
            '- Posting prohibited content or suspicious links',
            '- Ignoring staff instructions or community rules',
            '',
            'If this was a misunderstanding, no stress. Please take a moment to review the rules and adjust going forward.',
            '',
            'We also ask that you follow Discord Community Guidelines and keep the space respectful for everyone.',
            '',
            `If you believe this action was taken in error, submit an appeal by using \`/support\` with the official ${SUPPORT_BOT_MENTION} bot.`,
            '',
            'Thanks for understanding,',
            'Magic UI Moderation Team'
          ].join('\n')
        )
      )
  ];
}

function buildTimeoutNoticeComponents({ caseId, reason, moderatorTag, minutes, timestamp = Math.floor(Date.now() / 1000) }) {
  return [
    new ContainerBuilder()
      .setAccentColor(0xfaa61a)
      .addTextDisplayComponents(
        text('# Moderation Notice'),
        text(
          [
            'A temporary timeout has been applied in Magic UI.',
            '',
            `**Action:** Timeout (${minutes}m)`,
            `**Case ID:** #${caseId}`,
            `**Reason:** ${safe(reason)}`,
            `**Issued by:** ${safe(moderatorTag)}`,
            `**Date:** <t:${timestamp}:F>`,
            '',
            `If you believe this action was taken in error, use \`/support\` with the official ${SUPPORT_BOT_MENTION} bot.`
          ].join('\n')
        )
      )
  ];
}

function buildModerationLogComponents({ action, member, user, moderator, reason, caseId, color = 0xef4444 }) {
  const target = member?.user || user;
  return buildLogComponents(
    `${EMOJI_TEXT.report} Moderation Log`,
    [
      `Action: ${action}`,
      `User: ${target?.tag || 'Unknown'} (${target?.id || member?.id || 'Unknown'})`,
      `Moderator: ${moderator.tag} (${moderator.id})`,
      `Reason: ${safe(reason)}`,
      `Case ID: #${caseId}`,
      `Date: <t:${Math.floor(Date.now() / 1000)}:F>`
    ].join('\n'),
    color
  );
}

function buildVerificationWelcomeComponents(guildId = GUILD_ID) {
  return [
    new ContainerBuilder()
      .setAccentColor(0x22c55e)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.check} Verify Your Magic UI Account`),
        text(
          [
            'Before chatting, please complete this quick verification check.',
            '',
            'Select the button below and type the simple word shown in the form.',
            '',
            'Once verified, you will receive the verified role and can chat normally.'
          ].join('\n')
        )
      )
      .addActionRowComponents(
        buttonRow([
          new ButtonBuilder()
            .setCustomId(`verify_start_${guildId}`)
            .setLabel('Start Verification')
            .setStyle(ButtonStyle.Success)
        ])
      )
  ];
}

function buildUnverifiedPromptComponents(user, guildId = GUILD_ID) {
  return [
    new ContainerBuilder()
      .setAccentColor(0xfaa61a)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.rules} Verification Required`),
        text(
          [
            `${user}, your message in Magic UI was removed because your account is not verified yet.`,
            '',
            'Use the button below and type the simple word shown in the form. After that, you can chat normally.'
          ].join('\n')
        )
      )
      .addActionRowComponents(
        buttonRow([
          new ButtonBuilder()
            .setCustomId(`verify_start_${guildId}`)
            .setLabel('Verify Now')
            .setStyle(ButtonStyle.Success)
        ])
      )
  ];
}

function buildVerificationResultComponents(title, body, color = 0x22c55e) {
  return buildNoticeComponents(title, body, color);
}

module.exports = {
  EMOJIS,
  EMOJI_TEXT,
  EPHEMERAL_V2_FLAGS,
  GUILD_ID,
  ROLE_RESTORE_EXCLUDED_ROLE_IDS,
  SILENT_MENTIONS,
  STAFF_ROLE_IDS,
  SUPPORT_CATEGORY_ID,
  SUPPORT_MODLOG_ID,
  SUPPORT_PANEL_CHANNEL_ID,
  VERIFIED_ROLE_ID,
  V2_FLAGS,
  buildBanNoticeComponents,
  buildCloseConfirmComponents,
  buildLogComponents,
  buildModerationLogComponents,
  buildNoticeComponents,
  buildRoleLogComponents,
  buildRoleRestoreOfferComponents,
  buildRoleRestoreResultComponents,
  buildRoleUpdateComponents,
  buildSupportMenuComponents,
  buildSupportPanelComponents,
  buildTicketOpenedComponents,
  buildTimeoutNoticeComponents,
  buildUnverifiedPromptComponents,
  buildVerificationResultComponents,
  buildVerificationWelcomeComponents,
  buildWarningNoticeComponents,
  buildWelcomeComponents,
  supportReason
};
