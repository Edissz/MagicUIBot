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
  reportChannelId: '1151318734158446624',
  staffRoleIds: ['1405207645618700349', '1324536259439362089'],
  colors: {
    panel: 0x06072c,
    forHire: 0x2dd4bf,
    hiring: 0x60a5fa,
    admin: 0xfacc15,
    report: 0xef4444,
    verified: 0x22c55e
  }
};

const EMOJIS = {
  forHire: { id: '1492616764335460482', name: 'joblinkbulkrounded' },
  hiring: { id: '1492616786166677544', name: 'jobsearchbulkrounded1' },
  report: { id: '1492622062647250995', name: 'alert02bulkrounded' },
  verified: { id: '1474144632844718251', name: 'verified' },
  apply: { id: '1473388533971681464', name: '4534' }
};

const EMOJI_TEXT = {
  forHire: '<:joblinkbulkrounded:1492616764335460482>',
  hiring: '<:jobsearchbulkrounded1:1492616786166677544>',
  report: '<:alert02bulkrounded:1492622062647250995>',
  verified: '<:verified:1474144632844718251>',
  apply: '<:4534:1473388533971681464>'
};

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

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator(spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
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
  return `${average}/5 from ${reviews.length} review${reviews.length === 1 ? '' : 's'}`;
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
    .setPlaceholder('Choose what you want to post')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Post For Hire')
        .setDescription('Offer your skills, services, or availability.')
        .setValue('for_hire')
        .setEmoji(EMOJIS.forHire),
      new StringSelectMenuOptionBuilder()
        .setLabel('Post Hiring Position')
        .setDescription('Share an open role, gig, commission, or project.')
        .setValue('hiring')
        .setEmoji(EMOJIS.hiring)
    );

  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.panel)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.hiring} MagicUI Job Board`),
        text(
          [
            'Post serious work opportunities for the MagicUI community.',
            `${EMOJI_TEXT.forHire} **For Hire** posts go to <#${CONFIG.forHireChannelId}>.`,
            `${EMOJI_TEXT.hiring} **Hiring** posts go to <#${CONFIG.hiringChannelId}>.`,
            `${EMOJI_TEXT.verified} Staff can verify trusted opportunities after review.`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text('Choose the post type below. You will get a form for title, text, images, and contact details.')
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(menu))
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(`${EMOJI_TEXT.report} Every post can be reported and reviewed by staff.`)
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

  const container = new ContainerBuilder()
    .setAccentColor(post.verified ? CONFIG.colors.verified : meta.color)
    .addTextDisplayComponents(
      text(`# ${meta.emojiText} ${post.title}`),
      text(
        [
          `**${meta.label}** by <@${post.authorId}>`,
          `${verified}`,
          `Status: **${statusLabel(post)}**`,
          `Posted: <t:${Math.floor(post.createdAt / 1000)}:R>`
        ].join('\n')
      )
    )
    .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
    .addTextDisplayComponents(
      text(post.body),
      text(
        [
          `**Contact:** ${post.contact}`,
          `**Reviews:** ${ratingSummary(reviews)}`,
          applyLine,
          latestReview ? `**Latest review:** ${latestReview.rating}/5 - ${latestReview.body}` : null
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
        .setEmoji(meta.emoji),
      new ButtonBuilder()
        .setCustomId(`job_review_${post.id}`)
        .setLabel('Review')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(EMOJIS.verified),
      new ButtonBuilder()
        .setCustomId(`job_report_${post.id}`)
        .setLabel('Report')
        .setStyle(ButtonStyle.Danger)
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
  const meta = getTypeMeta(post.type);
  return [
    new ContainerBuilder()
      .setAccentColor(meta.color)
      .addTextDisplayComponents(
        text(`# ${meta.emojiText} Contact Details`),
        text([`Post: **${post.title}**`, `Poster: <@${post.authorId}>`, `Contact: ${post.contact}`].join('\n'))
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

function buildJobPostModal(type) {
  const meta = getTypeMeta(type);
  const modal = new ModalBuilder().setCustomId(`job_post_modal_${type}`).setTitle(`Create ${meta.label} Post`);

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
    .setPlaceholder('Describe the work, skills, budget/rate, requirements, timeline, and important links.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800);

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
    new ActionRowBuilder().addComponents(largeImage),
    new ActionRowBuilder().addComponents(image),
    new ActionRowBuilder().addComponents(contact)
  );

  return modal;
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
  buildJobPanelComponents,
  buildJobPostModal,
  buildPostComponents,
  buildReportComponents,
  buildReportModal,
  buildReviewModal,
  buildApplyModal,
  cleanText,
  cleanTitle,
  createId,
  fetchTextChannel,
  getPost,
  getTypeMeta,
  isAdminMember,
  loadStore,
  normalizeImageUrl,
  publicPostUrl,
  saveStore,
  sendAdminHub,
  sendPublicPanel,
  updatePost,
  updateReport
};
