const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
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
  TextInputStyle
} = require('discord.js');

const CONFIG = {
  guildId: '1151315619246002176',
  jobPanelChannelId: '1501531376581742622',
  forHireChannelId: '1501531243395809440',
  hiringChannelId: '1501531376581742622',
  adminChannelId: '1501536845794775060',
  reportChannelId: '1501563431218708570',
  staffRoleIds: ['1405207645618700349', '1324536259439362089'],
  colors: {
    panel: 0xf5a3c7,
    forHire: 0x2dd4bf,
    hiring: 0x60a5fa,
    admin: 0xfacc15,
    report: 0xef4444,
    verified: 0x22c55e,
    neutral: 0x2b2d31
  }
};

const EMOJIS = {
  forHire: { id: '1492616764335460482', name: 'joblinkbulkrounded' },
  hiring: { id: '1492616786166677544', name: 'jobsearchbulkrounded1' },
  report: { id: '1492622062647250995', name: 'alert02bulkrounded' },
  verified: { id: '1501564584211779604', name: 'checkmarkbadge02bulkrounded' },
  apply: { id: '1473388533971681464', name: '4534' },
  review: { id: '1501563855539535882', name: 'starbulkrounded' },
  starGold: { id: '1501564079813431427', name: 'starbulkrounded1' },
  contact: { id: '1501564351763710137', name: 'mailaccount02bulkrounded' }
};

const EMOJI_TEXT = {
  forHire: '<:joblinkbulkrounded:1492616764335460482>',
  hiring: '<:jobsearchbulkrounded1:1492616786166677544>',
  report: '<:alert02bulkrounded:1492622062647250995>',
  verified: '<:checkmarkbadge02bulkrounded:1501564584211779604>',
  apply: '<:4534:1473388533971681464>',
  review: '<:starbulkrounded:1501563855539535882>',
  starGold: '<:starbulkrounded1:1501564079813431427>',
  contact: '<:mailaccount02bulkrounded:1501564351763710137>'
};

const CATEGORY_OPTIONS = [
  { label: 'Design Engineering', value: 'design_engineering', description: 'UI systems, motion, prototyping, frontend craft.' },
  { label: 'Frontend Development', value: 'frontend_development', description: 'React, Next.js, components, dashboards, landing pages.' },
  { label: 'UI / UX Design', value: 'ui_ux_design', description: 'Product design, visual design, flows, prototypes.' },
  { label: 'Brand / Graphics', value: 'brand_graphics', description: 'Brand kits, logos, social graphics, presentation visuals.' },
  { label: 'Full-Stack / Backend', value: 'full_stack_backend', description: 'APIs, databases, integrations, auth, infrastructure.' },
  { label: 'Other', value: 'other', description: 'Something useful that does not fit the main categories.' }
];

const PAYMENT_OPTIONS = [
  { label: 'Paid - PayPal', value: 'paid_paypal', description: 'Payment handled through PayPal.' },
  { label: 'Paid - Crypto', value: 'paid_crypto', description: 'Payment handled through crypto.' },
  { label: 'Paid - Other Method', value: 'paid_other', description: 'Stripe, bank, Wise, local transfer, or another method.' },
  { label: 'Volunteer / Unpaid', value: 'volunteer', description: 'No payment; contribution, collaboration, or community work.' },
  { label: 'Negotiable', value: 'negotiable', description: 'Payment method or compensation is decided after contact.' }
];

const STORE_FILE = path.join(__dirname, '..', 'data', 'jobPosts.json');

function defaultStore() {
  return {
    version: 1,
    posts: {},
    reports: {}
  };
}

function ensureStoreFile() {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore(), null, 2));
  }
}

function loadStore() {
  ensureStoreFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    return {
      ...defaultStore(),
      ...parsed,
      posts: parsed.posts || {},
      reports: parsed.reports || {}
    };
  } catch (err) {
    console.error('Failed to load job board store:', err);
    return defaultStore();
  }
}

function saveStore(store) {
  ensureStoreFile();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function addPost(post) {
  const store = loadStore();
  store.posts[post.id] = post;
  saveStore(store);
  return post;
}

function getPost(postId) {
  return loadStore().posts[postId] || null;
}

function updatePost(postId, updater) {
  const store = loadStore();
  const post = store.posts[postId];
  if (!post) return null;
  const next = updater(post, store) || post;
  store.posts[postId] = next;
  saveStore(store);
  return next;
}

function addReport(report) {
  const store = loadStore();
  const post = store.posts[report.postId];
  if (!post) return null;

  if (!Array.isArray(post.reports)) post.reports = [];
  post.reports.push(report.id);
  store.reports[report.id] = report;
  store.posts[post.id] = post;
  saveStore(store);
  return { post, report };
}

function updateReport(reportId, updater) {
  const store = loadStore();
  const report = store.reports[reportId];
  if (!report) return null;
  const next = updater(report, store) || report;
  store.reports[reportId] = next;
  saveStore(store);
  return next;
}

function createId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isAdminMember(member) {
  if (!member || !member.permissions) return false;
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild)
  );
}

function canUseCustomPostColor(member) {
  return isAdminMember(member) || Boolean(member?.premiumSince || member?.premiumSinceTimestamp);
}

async function fetchTextChannel(guild, channelId) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return null;
  return channel;
}

function cleanText(value, maxLength = 1000, fallback = 'N/A') {
  const cleaned = String(value || '')
    .trim()
    .replace(/@everyone/gi, '[everyone]')
    .replace(/@here/gi, '[here]');

  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

function cleanTitle(value) {
  return cleanText(value, 90, 'Untitled post').replace(/\s+/g, ' ');
}

function normalizeImageUrl(value) {
  const raw = cleanText(value, 500, '');
  if (!raw || /^(n\/a|none|no|skip)$/i.test(raw)) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeHexColor(value) {
  const raw = cleanText(value, 20, '').replace(/^#/, '').trim();
  if (!raw || /^(n\/a|none|no|skip)$/i.test(raw)) return null;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return undefined;
  return Number.parseInt(raw, 16);
}

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator(spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

function optionLabel(options, value, fallback = 'Not specified') {
  return options.find(option => option.value === value)?.label || fallback;
}

function categoryLabel(value) {
  return optionLabel(CATEGORY_OPTIONS, value, 'Other');
}

function paymentLabel(value) {
  return optionLabel(PAYMENT_OPTIONS, value, 'Not specified');
}

function getTypeMeta(type) {
  if (type === 'for_hire') {
    return {
      label: 'For Hire',
      channelId: CONFIG.forHireChannelId,
      emoji: EMOJIS.forHire,
      emojiText: EMOJI_TEXT.forHire,
      color: CONFIG.colors.forHire
    };
  }

  return {
    label: 'Hiring Opportunity',
    channelId: CONFIG.hiringChannelId,
    emoji: EMOJIS.hiring,
    emojiText: EMOJI_TEXT.hiring,
    color: CONFIG.colors.hiring
  };
}

function ratingSummary(reviews = []) {
  if (!reviews.length) return 'No reviews yet';
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const average = Math.round((total / reviews.length) * 10) / 10;
  const rounded = Math.max(1, Math.min(5, Math.round(average)));
  const stars = `${EMOJI_TEXT.starGold.repeat(rounded)}${EMOJI_TEXT.review.repeat(5 - rounded)}`;
  return `${stars} ${average}/5 from ${reviews.length} review${reviews.length === 1 ? '' : 's'}`;
}

function statusLabel(post) {
  if (post.removed) return 'Taken down';
  if (post.status === 'filled') return 'Filled';
  if (post.status === 'closed') return 'Closed';
  return 'Open';
}

function publicPostUrl(post) {
  if (!post.messageId || !post.targetChannelId) return 'Not published yet';
  return `https://discord.com/channels/${CONFIG.guildId}/${post.targetChannelId}/${post.messageId}`;
}

function buildJobPanelComponents() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('job_board_select')
    .setPlaceholder('Choose post type')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Post For Hire')
        .setDescription('Offer your skills, services, portfolio, or availability.')
        .setValue('for_hire')
        .setEmoji(EMOJIS.forHire),
      new StringSelectMenuOptionBuilder()
        .setLabel('Post Hiring Position')
        .setDescription('Share a role, gig, commission, bounty, or project brief.')
        .setValue('hiring')
        .setEmoji(EMOJIS.hiring)
    );

  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.panel)
      .addTextDisplayComponents(
        text('# MagicUI Job Board'),
        text(
          [
            `Find talent, offer services, or share work opportunities in <#${CONFIG.jobPanelChannelId}>.`,
            '',
            `${EMOJI_TEXT.forHire} **For Hire:** showcase your skills in <#${CONFIG.forHireChannelId}>.`,
            `${EMOJI_TEXT.hiring} **Hiring:** post roles, gigs, or briefs in <#${CONFIG.hiringChannelId}>.`,
            `${EMOJI_TEXT.verified} **Verified:** staff-reviewed opportunities.`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(
          [
            '### Before Posting',
            'Use a clear title, choose the right category, include payment details, and add a real contact method.',
            'Spam, unsafe links, or misleading posts may be removed.'
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(
          [
            '### Create A Post',
            'Choose a post type below. You can preview before publishing and optionally add images or a booster/admin accent color.'
          ].join('\n')
        )
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(menu))
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(`${EMOJI_TEXT.report} Reports are private and reviewed by moderation.`)
      )
  ];
}

function buildAdminHubComponents(sourceUser) {
  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.admin)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.verified} Job Board Admin Hub`),
        text(
          [
            `Public panel channel: <#${CONFIG.jobPanelChannelId}>`,
            `For hire channel: <#${CONFIG.forHireChannelId}>`,
            `Hiring channel: <#${CONFIG.hiringChannelId}>`,
            `Report channel: <#${CONFIG.reportChannelId}>`,
            '',
            `Last refreshed by: ${sourceUser ? `<@${sourceUser.id}>` : 'Staff'}`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text('New posts will create a private review card here. Staff can verify, fill, close, take down, or restore posts from those cards.')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('job_admin_send_panel')
            .setLabel('Send Public Panel')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(EMOJIS.hiring),
          new ButtonBuilder()
            .setLabel('Open Reports')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${CONFIG.guildId}/${CONFIG.reportChannelId}`)
            .setEmoji(EMOJIS.report)
        )
      )
  ];
}

function buildPostComponents(post) {
  const meta = getTypeMeta(post.type);
  const reviews = Array.isArray(post.reviews) ? post.reviews : [];
  const applications = Array.isArray(post.applications) ? post.applications : [];
  const verified = post.verified
    ? `${EMOJI_TEXT.verified} **Verified opportunity**${post.verifiedBy ? ` by <@${post.verifiedBy}>` : ''}`
    : 'Staff verification pending';
  const latestReview = reviews.length ? reviews[reviews.length - 1] : null;
  const applyLine = post.type === 'hiring' ? `Applications: ${applications.length}` : null;
  const latestReviewRating = Math.max(1, Math.min(5, Math.round(Number(latestReview?.rating || 0))));
  const latestReviewLine = latestReview
    ? `**Latest review:** ${EMOJI_TEXT.starGold.repeat(latestReviewRating)}${EMOJI_TEXT.review.repeat(5 - latestReviewRating)} ${latestReview.body}`
    : null;

  const container = new ContainerBuilder();
  if (Number.isInteger(post.accentColor)) container.setAccentColor(post.accentColor);

  container
    .addTextDisplayComponents(
      text(`# ${post.title}`),
      text(
        [
          `${meta.emojiText} **${meta.label}** by <@${post.authorId}>`,
          `${verified}`,
          `Category: **${categoryLabel(post.category)}**`,
          `Payment: **${paymentLabel(post.payment)}**`,
          `Status: **${statusLabel(post)}**`,
          `Posted: <t:${Math.floor(post.createdAt / 1000)}:R>`
        ].join('\n')
      )
    )
    .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
    .addTextDisplayComponents(text('### Details'))
    .addTextDisplayComponents(
      text(post.body),
      text(
        [
          `${EMOJI_TEXT.contact} **Contact:** ${post.contact}`,
          `${EMOJI_TEXT.review} **Reviews:** ${ratingSummary(reviews)}`,
          applyLine,
          latestReviewLine
        ]
          .filter(Boolean)
          .join('\n')
      )
    );

  const images = [post.largeImageUrl, post.imageUrl].filter(Boolean);
  if (images.length) {
    const gallery = new MediaGalleryBuilder();
    for (const [index, url] of images.entries()) {
      gallery.addItems(
        new MediaGalleryItemBuilder()
          .setURL(url)
          .setDescription(index === 0 ? `${post.title} large image` : `${post.title} extra image`)
      );
    }
    container.addMediaGalleryComponents(gallery);
  }

  if (!post.removed) {
    const buttons = [];
    if (post.type === 'hiring' && post.status === 'open') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`job_apply_${post.id}`)
          .setLabel('Apply')
          .setStyle(ButtonStyle.Primary)
          .setEmoji(EMOJIS.apply)
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`job_contact_${post.id}`)
        .setLabel('Contact')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(EMOJIS.contact),
      new ButtonBuilder()
        .setCustomId(`job_review_${post.id}`)
        .setLabel('Review')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(EMOJIS.review),
      new ButtonBuilder()
        .setCustomId(`job_report_${post.id}`)
        .setLabel('Report')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(EMOJIS.report)
    );

    container.addSeparatorComponents(separator());
    container.addActionRowComponents(new ActionRowBuilder().addComponents(buttons));
  }

  return [container];
}

function buildAdminPostComponents(post) {
  const meta = getTypeMeta(post.type);
  const reportCount = Array.isArray(post.reports) ? post.reports.length : 0;
  const reviewCount = Array.isArray(post.reviews) ? post.reviews.length : 0;
  const applicationCount = Array.isArray(post.applications) ? post.applications.length : 0;
  const verifyButton = new ButtonBuilder()
    .setCustomId(`job_admin_verify_${post.id}`)
    .setLabel(post.verified ? 'Remove Verify' : 'Verify')
    .setStyle(post.verified ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setEmoji(EMOJIS.verified);

  const restoreOrDelete = post.removed
    ? new ButtonBuilder()
        .setCustomId(`job_admin_restore_${post.id}`)
        .setLabel('Restore Post')
        .setStyle(ButtonStyle.Success)
    : new ButtonBuilder()
        .setCustomId(`job_admin_delete_${post.id}`)
        .setLabel('Take Down')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(EMOJIS.report);

  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.admin)
      .addTextDisplayComponents(
        text(`# ${meta.emojiText} Admin Review: ${post.title}`),
        text(
          [
            `Author: <@${post.authorId}> (${post.authorId})`,
            `Type: **${meta.label}**`,
            `Category: **${categoryLabel(post.category)}**`,
            `Payment: **${paymentLabel(post.payment)}**`,
            `Custom color: **${Number.isInteger(post.accentColor) ? `#${post.accentColor.toString(16).padStart(6, '0').toUpperCase()}` : 'None'}**`,
            `Status: **${statusLabel(post)}**`,
            `Verified: **${post.verified ? 'Yes' : 'No'}**`,
            `Reports: **${reportCount}** | Reviews: **${reviewCount}** | Applications: **${applicationCount}**`,
            `Public post: ${publicPostUrl(post)}`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(`Contact: ${post.contact}`))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          verifyButton,
          new ButtonBuilder()
            .setCustomId(`job_admin_fill_${post.id}`)
            .setLabel('Mark Filled')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(post.status === 'filled' || post.removed),
          new ButtonBuilder()
            .setCustomId(`job_admin_close_${post.id}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(post.status === 'closed' || post.removed),
          new ButtonBuilder()
            .setCustomId(`job_admin_reopen_${post.id}`)
            .setLabel('Reopen')
            .setStyle(ButtonStyle.Success)
            .setDisabled(post.status === 'open' || post.removed),
          restoreOrDelete
        )
      )
  ];
}

function buildReportComponents(post, report) {
  const resolved = report.resolved
    ? `Resolved by <@${report.resolvedBy}> <t:${Math.floor(report.resolvedAt / 1000)}:R>`
    : 'Waiting for staff review';

  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.report)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.report} Job Board Report`),
        text(
          [
            `Post: **${post.title}**`,
            `Reporter: <@${report.reporterId}> (${report.reporterId})`,
            `Post author: <@${post.authorId}> (${post.authorId})`,
            `Status: **${resolved}**`,
            `Public post: ${publicPostUrl(post)}`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(`**Reason:**\n${report.reason}`), text(`**Evidence:** ${report.evidence || 'N/A'}`))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`job_admin_delete_${post.id}`)
            .setLabel('Take Down')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(EMOJIS.report)
            .setDisabled(post.removed),
          new ButtonBuilder()
            .setCustomId(`job_admin_verify_${post.id}`)
            .setLabel(post.verified ? 'Remove Verify' : 'Verify')
            .setStyle(post.verified ? ButtonStyle.Secondary : ButtonStyle.Success)
            .setEmoji(EMOJIS.verified),
          new ButtonBuilder()
            .setCustomId(`job_report_resolve_${report.id}`)
            .setLabel(report.resolved ? 'Resolved' : 'Mark Reviewed')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(report.resolved))
        )
      )
  ];
}

function buildContactComponents(post) {
  const container = new ContainerBuilder();
  if (Number.isInteger(post.accentColor)) container.setAccentColor(post.accentColor);

  return [
    container
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.contact} Contact Details`),
        text(
          [
            `Post: **${post.title}**`,
            `Category: **${categoryLabel(post.category)}**`,
            `Payment: **${paymentLabel(post.payment)}**`,
            `Poster: <@${post.authorId}>`,
            `Contact: ${post.contact}`
          ].join('\n')
        )
      )
  ];
}

function buildApplicationComponents(post, application) {
  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.hiring)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.apply} New Application`),
        text(
          [
            `Post: **${post.title}**`,
            `Applicant: <@${application.applicantId}> (${application.applicantId})`,
            `Contact: ${application.contact}`,
            `Portfolio: ${application.portfolio || 'N/A'}`,
            `Availability: ${application.availability || 'N/A'}`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(`**Experience:**\n${application.experience}`), text(`**Message:**\n${application.message}`))
  ];
}

function buildJobSetupComponents(draft) {
  const meta = getTypeMeta(draft.type);
  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId(`job_setup_category_${draft.id}`)
    .setPlaceholder(draft.category ? `Category: ${categoryLabel(draft.category)}` : 'Choose the closest category')
    .addOptions(
      ...CATEGORY_OPTIONS.map(option =>
        new StringSelectMenuOptionBuilder()
          .setLabel(option.label)
          .setDescription(option.description)
          .setValue(option.value)
          .setDefault(option.value === draft.category)
      )
    );

  const paymentSelect = new StringSelectMenuBuilder()
    .setCustomId(`job_setup_payment_${draft.id}`)
    .setPlaceholder(draft.payment ? `Payment: ${paymentLabel(draft.payment)}` : 'Choose payment or compensation type')
    .addOptions(
      ...PAYMENT_OPTIONS.map(option =>
        new StringSelectMenuOptionBuilder()
          .setLabel(option.label)
          .setDescription(option.description)
          .setValue(option.value)
          .setDefault(option.value === draft.payment)
      )
    );

  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.panel)
      .addTextDisplayComponents(
        text(`# Create ${meta.label} Post`),
        text(
          [
            'Start with category and payment. After that, the bot will open the post details form.',
            `Selected category: **${categoryLabel(draft.category)}**`,
            `Selected payment: **${paymentLabel(draft.payment)}**`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(categorySelect),
        new ActionRowBuilder().addComponents(paymentSelect),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`job_setup_details_${draft.id}`)
            .setLabel('Continue')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!draft.category || !draft.payment),
          new ButtonBuilder()
            .setCustomId(`job_draft_cancel_${draft.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  ];
}

function buildJobPostModal(draftId, type) {
  const meta = getTypeMeta(type);
  const modal = new ModalBuilder().setCustomId(`job_post_modal_${draftId}`).setTitle(`Create ${meta.label} Post`);

  const title = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Post title')
    .setPlaceholder(type === 'for_hire' ? 'UI designer available for commissions' : 'Hiring frontend developer')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(90);

  const body = new TextInputBuilder()
    .setCustomId('body')
    .setLabel('Main text')
    .setPlaceholder('Describe scope, skills, budget/rate, requirements, timeline, proof links, and expectations.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800);

  const contact = new TextInputBuilder()
    .setCustomId('contact')
    .setLabel('Who should they contact?')
    .setPlaceholder('Discord username, user mention, email, website, or application link.')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(300);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(body),
    new ActionRowBuilder().addComponents(contact)
  );

  return modal;
}

function buildJobMediaModal(draftId) {
  const modal = new ModalBuilder().setCustomId(`job_media_modal_${draftId}`).setTitle('Optional Post Media');

  const largeImage = new TextInputBuilder()
    .setCustomId('large_image')
    .setLabel('Large image URL (optional)')
    .setPlaceholder('https://...')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500);

  const image = new TextInputBuilder()
    .setCustomId('image')
    .setLabel('Second image URL (optional)')
    .setPlaceholder('https://...')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500);

  const color = new TextInputBuilder()
    .setCustomId('accent_color')
    .setLabel('Accent hex color (boosters/admins only)')
    .setPlaceholder('#FFFFFF, 06072C, or leave blank')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder().addComponents(largeImage),
    new ActionRowBuilder().addComponents(image),
    new ActionRowBuilder().addComponents(color)
  );

  return modal;
}

function buildDraftPreviewComponents(draft) {
  const meta = getTypeMeta(draft.type);
  const accentText = Number.isInteger(draft.accentColor)
    ? `#${draft.accentColor.toString(16).padStart(6, '0').toUpperCase()}`
    : draft.requestedAccentColor && !draft.customColorAllowed
      ? 'Ignored - boosters/admins only'
      : 'None';

  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.panel)
      .addTextDisplayComponents(
        text(`# Review Job Post Draft`),
        text(
          [
            `${meta.emojiText} Type: **${meta.label}**`,
            `Title: **${draft.title}**`,
            `Category: **${categoryLabel(draft.category)}**`,
            `Payment: **${paymentLabel(draft.payment)}**`,
            `Contact: ${draft.contact}`,
            `Accent color: **${accentText}**`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(`### Description Preview\n${draft.body.slice(0, 900)}${draft.body.length > 900 ? '...' : ''}`)
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text('Publish now, or add optional media/color first. Images and custom colors are optional.')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`job_draft_publish_${draft.id}`)
            .setLabel('Publish Post')
            .setStyle(ButtonStyle.Success)
            .setEmoji(EMOJIS.verified),
          new ButtonBuilder()
            .setCustomId(`job_draft_media_${draft.id}`)
            .setLabel('Images / Color')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.forHire),
          new ButtonBuilder()
            .setCustomId(`job_draft_cancel_${draft.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  ];
}

function buildReportModal(postId) {
  const modal = new ModalBuilder().setCustomId(`job_report_modal_${postId}`).setTitle('Report Job Post');

  const reason = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Why are you reporting this?')
    .setPlaceholder('Spam, scam, stolen work, wrong channel, unsafe link, etc.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const evidence = new TextInputBuilder()
    .setCustomId('evidence')
    .setLabel('Evidence link or note (optional)')
    .setPlaceholder('Paste proof, screenshots, message links, or anything useful.')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder().addComponents(reason), new ActionRowBuilder().addComponents(evidence));
  return modal;
}

function buildReviewModal(postId) {
  const modal = new ModalBuilder().setCustomId(`job_review_modal_${postId}`).setTitle('Leave Job Board Review');

  const rating = new TextInputBuilder()
    .setCustomId('rating')
    .setLabel('Rating from 1 to 5')
    .setPlaceholder('5')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  const body = new TextInputBuilder()
    .setCustomId('body')
    .setLabel('Short review')
    .setPlaceholder('Share what went well or what staff should know.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder().addComponents(rating), new ActionRowBuilder().addComponents(body));
  return modal;
}

function buildApplyModal(postId) {
  const modal = new ModalBuilder().setCustomId(`job_apply_modal_${postId}`).setTitle('Apply To Opportunity');

  const contact = new TextInputBuilder()
    .setCustomId('contact')
    .setLabel('Your contact')
    .setPlaceholder('Discord username, email, portfolio contact, etc.')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(300);

  const portfolio = new TextInputBuilder()
    .setCustomId('portfolio')
    .setLabel('Portfolio URL (optional)')
    .setPlaceholder('https://...')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500);

  const experience = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('Experience / fit')
    .setPlaceholder('Tell them why you are a good fit.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const availability = new TextInputBuilder()
    .setCustomId('availability')
    .setLabel('Availability (optional)')
    .setPlaceholder('Timezone, hours/week, start date, etc.')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(250);

  const message = new TextInputBuilder()
    .setCustomId('message')
    .setLabel('Message to poster')
    .setPlaceholder('Anything else you want them to know.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(800);

  modal.addComponents(
    new ActionRowBuilder().addComponents(contact),
    new ActionRowBuilder().addComponents(portfolio),
    new ActionRowBuilder().addComponents(experience),
    new ActionRowBuilder().addComponents(availability),
    new ActionRowBuilder().addComponents(message)
  );

  return modal;
}

async function sendPublicPanel(guild) {
  const channel = await fetchTextChannel(guild, CONFIG.jobPanelChannelId);
  if (!channel) throw new Error('Job panel channel not found.');

  const message = await channel.send({
    components: buildJobPanelComponents(),
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  });

  return message;
}

async function sendAdminHub(guild, sourceUser) {
  const channel = await fetchTextChannel(guild, CONFIG.adminChannelId);
  if (!channel) return null;

  return channel.send({
    components: buildAdminHubComponents(sourceUser),
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  });
}

async function autoPublish(message) {
  if (message.channel?.type !== ChannelType.GuildAnnouncement) return;
  await message.crosspost().catch(() => null);
}

module.exports = {
  CONFIG,
  EMOJIS,
  EMOJI_TEXT,
  STORE_FILE,
  addPost,
  addReport,
  autoPublish,
  buildAdminHubComponents,
  buildAdminPostComponents,
  buildApplicationComponents,
  buildContactComponents,
  buildDraftPreviewComponents,
  buildJobPanelComponents,
  buildJobMediaModal,
  buildJobPostModal,
  buildJobSetupComponents,
  buildPostComponents,
  buildReportComponents,
  buildReportModal,
  buildReviewModal,
  buildApplyModal,
  canUseCustomPostColor,
  categoryLabel,
  cleanText,
  cleanTitle,
  createId,
  fetchTextChannel,
  getPost,
  getTypeMeta,
  isAdminMember,
  loadStore,
  normalizeHexColor,
  normalizeImageUrl,
  paymentLabel,
  publicPostUrl,
  saveStore,
  sendAdminHub,
  sendPublicPanel,
  updatePost,
  updateReport
};
