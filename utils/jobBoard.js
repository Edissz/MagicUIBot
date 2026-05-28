const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
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
  TextInputStyle
} = require('discord.js');

const CONFIG = {
  guildId: '1151315619246002176',
  jobPanelChannelId: '1501531376581742622',
  forHireChannelId: '1501531243395809440',
  hiringChannelId: '1501531310760657018',
  marketplaceChannelId: '1509135529017610321',
  templatePurchaseCategoryId: '1502554201916706826',
  adminChannelId: '1501536845794775060',
  reportChannelId: '1501563431218708570',
  staffRoleIds: ['1405207645618700349', '1324536259439362089'],
  templateSellerRoleIds: [
    '1217664590750547999',
    '1237525644406165716',
    '1440375880924004412',
    '1500513236846379099',
    '1246103902265413644',
    '1421872176424030309'
  ],
  colors: {
    panel: 0xf38cb6,
    forHire: 0x2dd4bf,
    hiring: 0x60a5fa,
    marketplace: 0x7dd3fc,
    admin: 0xfacc15,
    report: 0xef4444,
    verified: 0x22c55e,
    neutral: 0x2b2d31
  }
};

const EMOJIS = {
  check: { id: '1430525546608988203', name: 'check' },
  cross: { id: '1430525603701850165', name: 'cross' },
  forHire: { id: '1492616764335460482', name: 'joblinkbulkrounded' },
  hiring: { id: '1492616786166677544', name: 'jobsearchbulkrounded1' },
  report: { id: '1492622062647250995', name: 'alert02bulkrounded' },
  verified: { id: '1501564584211779604', name: 'checkmarkbadge02bulkrounded' },
  apply: { id: '1473388533971681464', name: '4534' },
  review: { id: '1501563855539535882', name: 'starbulkrounded' },
  starGold: { id: '1501564079813431427', name: 'starbulkrounded1' },
  contact: { id: '1501564351763710137', name: 'mailaccount02bulkrounded' },
  payment: { id: '1421842840899551332', name: 'techouse212' },
  marketplace: { id: '1501564079813431427', name: 'starbulkrounded1' }
};

const EMOJI_TEXT = {
  check: '<:check:1430525546608988203>',
  cross: '<:cross:1430525603701850165>',
  forHire: '<:joblinkbulkrounded:1492616764335460482>',
  hiring: '<:jobsearchbulkrounded1:1492616786166677544>',
  report: '<:alert02bulkrounded:1492622062647250995>',
  verified: '<:checkmarkbadge02bulkrounded:1501564584211779604>',
  apply: '<:4534:1473388533971681464>',
  review: '<:starbulkrounded:1501563855539535882>',
  starGold: '<:starbulkrounded1:1501564079813431427>',
  contact: '<:mailaccount02bulkrounded:1501564351763710137>',
  payment: '<:techouse212:1421842840899551332>',
  marketplace: '<:starbulkrounded1:1501564079813431427>'
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

const TEMPLATE_CATEGORY_OPTIONS = [
  { label: 'SaaS Template', value: 'template_saas', description: 'SaaS apps, startups, auth flows, dashboards, and billing.' },
  { label: 'Dashboard / Admin', value: 'template_dashboard', description: 'Admin panels, analytics, CRMs, and internal tools.' },
  { label: 'Landing Page', value: 'template_landing', description: 'Marketing pages, waitlists, launch pages, and websites.' },
  { label: 'Component Pack', value: 'template_components', description: 'Reusable UI sections, blocks, and component kits.' },
  { label: 'Portfolio / Agency', value: 'template_portfolio', description: 'Portfolio, agency, studio, and personal brand templates.' },
  { label: 'Other Template', value: 'template_other', description: 'Any custom template that does not fit the main categories.' }
];

const TEMPLATE_PAYMENT_OPTIONS = [
  { label: 'PayPal', value: 'template_paypal', description: 'Buyer pays through PayPal instructions in the ticket.' },
  { label: 'Stripe / Card', value: 'template_stripe', description: 'Buyer pays by card, Stripe link, or invoice.' },
  { label: 'Crypto', value: 'template_crypto', description: 'Buyer pays through a crypto wallet or invoice.' },
  { label: 'Other / Manual', value: 'template_other_payment', description: 'Wise, bank transfer, local method, or manual invoice.' }
];

const STORE_FILE = path.join(__dirname, '..', 'data', 'jobPosts.json');
const JOB_PANEL_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1463916239528267839/1501582387732283464/She_Builds._14.png?ex=69fc9913&is=69fb4793&hm=c06b88903df4701b2ba4181f5916fc6b34baa8b17f815b879b040f5302061e96';

function defaultStore() {
  return {
    version: 1,
    posts: {},
    reports: {},
    purchases: {}
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
      reports: parsed.reports || {},
      purchases: parsed.purchases || {}
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

function addPurchase(purchase) {
  const store = loadStore();
  const post = store.posts[purchase.postId];
  if (!post) return null;

  if (!Array.isArray(post.purchases)) post.purchases = [];
  if (!post.purchases.includes(purchase.id)) post.purchases.push(purchase.id);

  store.purchases[purchase.id] = purchase;
  store.posts[post.id] = post;
  saveStore(store);
  return { post, purchase };
}

function getPurchase(purchaseId) {
  return loadStore().purchases[purchaseId] || null;
}

function updatePurchase(purchaseId, updater) {
  const store = loadStore();
  const purchase = store.purchases[purchaseId];
  if (!purchase) return null;
  const next = updater(purchase, store) || purchase;
  store.purchases[purchaseId] = next;
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

function canSellTemplates(member) {
  if (!member?.roles?.cache) return false;
  return CONFIG.templateSellerRoleIds.some(roleId => member.roles.cache.has(roleId));
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
  const option = options.find(item => item.value === value);
  if (option) return option.label;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function categoryOptionsFor(type) {
  return type === 'template' ? TEMPLATE_CATEGORY_OPTIONS : CATEGORY_OPTIONS;
}

function paymentOptionsFor(type) {
  return type === 'template' ? TEMPLATE_PAYMENT_OPTIONS : PAYMENT_OPTIONS;
}

function categoryLabel(value, type = null) {
  return optionLabel(categoryOptionsFor(type), value, type === 'template' ? 'Other Template' : 'Other');
}

function paymentLabel(value, type = null) {
  return optionLabel(paymentOptionsFor(type), value, 'Not specified');
}

function optionValueFromLabel(options, label) {
  const normalized = String(label || '').trim().toLowerCase();
  if (!normalized) return null;

  const option = options.find(item =>
    item.label.toLowerCase() === normalized ||
    item.value.toLowerCase() === normalized
  );

  return option?.value || label.trim();
}

function lineValue(textValue, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(textValue || '').match(new RegExp(`${escaped}:\\s*\\*\\*([^*]+)\\*\\*`, 'i'));
  return match?.[1]?.trim() || null;
}

function componentTextEntries(components, entries = [], seen = new Set()) {
  if (!Array.isArray(components)) return entries;

  for (const component of components) {
    if (!component || seen.has(component)) continue;
    seen.add(component);

    let raw = component;
    if (typeof component.toJSON === 'function') {
      try {
        raw = component.toJSON();
      } catch {
        raw = component;
      }
    }

    const content = raw?.content || raw?.data?.content;
    if (typeof content === 'string' && content.trim()) {
      entries.push(content.trim());
    }

    for (const key of ['components', 'items']) {
      if (Array.isArray(raw?.[key])) {
        componentTextEntries(raw[key], entries, seen);
      }
    }
  }

  return entries;
}

function inferPostType({ textValue, channelId, customId }) {
  if (customId?.startsWith('job_template_purchase_')) return 'template';
  if (customId?.startsWith('job_apply_')) return 'hiring';
  if (channelId === CONFIG.marketplaceChannelId || /Creator Marketplace Template/i.test(textValue)) return 'template';
  if (channelId === CONFIG.hiringChannelId || /Hiring Opportunity/i.test(textValue)) return 'hiring';
  return 'for_hire';
}

function legacyPostFromMessage(message, postId, customId = '') {
  if (!message || !postId) return null;

  const entries = componentTextEntries(message.components || []);
  const textValue = entries.join('\n');
  if (!textValue) return null;

  const type = inferPostType({ textValue, channelId: message.channelId, customId });
  const titleEntry = entries.find(entry => /^#\s+/.test(entry) && !/Job Board|Admin Review|Report/i.test(entry));
  const title = cleanTitle(titleEntry ? titleEntry.replace(/^#\s+/, '') : 'Recovered Job Board Post');
  const detailsIndex = entries.findIndex(entry => /^###\s+Details\b/i.test(entry));
  const body = cleanText(detailsIndex >= 0 ? entries[detailsIndex + 1] : '', 1800, 'Recovered from an existing public post.');
  const contact = textValue.match(/\*\*Contact:\*\*\s*(.+)$/im)?.[1]?.trim() ||
    (type === 'template' ? 'Ask the seller for payment instructions in this purchase ticket.' : 'Contact details were not recoverable from the existing post.');
  const authorId = textValue.match(/\bby\s+<@!?(\d{17,20})>/i)?.[1] ||
    textValue.match(/(?:Poster|Seller|Post author):\s*<@!?(\d{17,20})>/i)?.[1] ||
    null;
  const postedAt = Number(textValue.match(/Posted:\s*<t:(\d+):/i)?.[1] || 0) * 1000;
  const category = optionValueFromLabel(categoryOptionsFor(type), lineValue(textValue, 'Category'));
  const payment = optionValueFromLabel(paymentOptionsFor(type), lineValue(textValue, type === 'template' ? 'Accepted payment' : 'Payment'));
  const statusText = lineValue(textValue, 'Status')?.toLowerCase();
  const status = ['filled', 'closed'].includes(statusText) ? statusText : 'open';

  return {
    id: postId,
    type,
    category,
    payment,
    price: type === 'template' ? lineValue(textValue, 'Price') : null,
    stack: type === 'template' ? lineValue(textValue, 'Built with') : null,
    title,
    body,
    largeImageUrl: null,
    imageUrl: null,
    accentColor: null,
    requestedAccentColor: null,
    customColorAllowed: false,
    contact,
    authorId,
    authorTag: 'Recovered from public post',
    createdAt: postedAt || message.createdTimestamp || Date.now(),
    targetChannelId: message.channelId || getTypeMeta(type).channelId,
    messageId: message.id || null,
    status,
    verified: /Verified by staff/i.test(textValue),
    removed: false,
    reviews: [],
    reports: [],
    applications: [],
    purchases: [],
    recoveredFromMessage: true,
    recoveredAt: Date.now()
  };
}

function recoverPostFromMessage(message, postId, customId = '') {
  const existing = getPost(postId);
  if (existing) return existing;

  const post = legacyPostFromMessage(message, postId, customId);
  if (!post || !post.authorId) return null;

  return addPost(post);
}

function getTypeMeta(type) {
  if (type === 'template') {
    return {
      label: 'Creator Marketplace Template',
      channelId: CONFIG.marketplaceChannelId,
      emoji: EMOJIS.marketplace,
      emojiText: EMOJI_TEXT.marketplace,
      color: CONFIG.colors.marketplace
    };
  }

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
        .setEmoji(EMOJIS.hiring),
      new StringSelectMenuOptionBuilder()
        .setLabel('Sell Custom Template')
        .setDescription('List a premium template in the creator marketplace.')
        .setValue('template')
        .setEmoji(EMOJIS.marketplace)
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
            `${EMOJI_TEXT.marketplace} **Templates:** approved creators can sell custom templates in <#${CONFIG.marketplaceChannelId}>.`,
            `${EMOJI_TEXT.verified} **Verified:** staff-reviewed opportunities.`
          ].join('\n')
        )
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(JOB_PANEL_IMAGE_URL)
            .setDescription('MagicUI Job Board')
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
            'Choose a post type below. You can preview before publishing and optionally add images or a booster/admin accent color. Template selling is limited to active, trusted MagicUI creators.'
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
            `Creator marketplace: <#${CONFIG.marketplaceChannelId}>`,
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
  const isTemplate = post.type === 'template';
  const reviews = Array.isArray(post.reviews) ? post.reviews : [];
  const applications = Array.isArray(post.applications) ? post.applications : [];
  const verified = post.verified
    ? `${EMOJI_TEXT.verified} **Verified by staff**`
    : 'Staff verification pending';
  const latestReview = reviews.length ? reviews[reviews.length - 1] : null;
  const applyLine = post.type === 'hiring' ? `Applications: ${applications.length}` : null;
  const purchaseLine = isTemplate ? `Purchase tickets: ${(post.purchases || []).length}` : null;
  const latestReviewRating = Math.max(1, Math.min(5, Math.round(Number(latestReview?.rating || 0))));
  const latestReviewLine = latestReview
    ? `**Latest review:** ${EMOJI_TEXT.starGold.repeat(latestReviewRating)}${EMOJI_TEXT.review.repeat(5 - latestReviewRating)} ${latestReview.body}`
    : null;

  const container = new ContainerBuilder()
    .setAccentColor(Number.isInteger(post.accentColor) ? post.accentColor : meta.color);

  container
    .addTextDisplayComponents(
      text(`# ${post.title}`),
      text(
        [
          `${meta.emojiText} **${meta.label}** by <@${post.authorId}>`,
          `${verified}`,
          `Category: **${categoryLabel(post.category, post.type)}**`,
          isTemplate ? `Price: **${post.price || 'Not specified'}**` : `Payment: **${paymentLabel(post.payment, post.type)}**`,
          isTemplate ? `Accepted payment: **${paymentLabel(post.payment, post.type)}**` : null,
          isTemplate ? `Built with: **${post.stack || 'React / custom frontend'}**` : null,
          `Posted: <t:${Math.floor(post.createdAt / 1000)}:R>`
        ].filter(Boolean).join('\n')
      )
    )
    .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
    .addTextDisplayComponents(text('### Details'))
    .addTextDisplayComponents(
      text(post.body),
      text(
        [
          isTemplate
            ? `${EMOJI_TEXT.payment} **Purchase:** click **Purchase** to open a private payment and delivery ticket.`
            : `${EMOJI_TEXT.contact} **Contact:** ${post.contact}`,
          `${EMOJI_TEXT.review} **Reviews:** ${ratingSummary(reviews)}`,
          applyLine,
          purchaseLine,
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

    if (isTemplate && post.status === 'open') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`job_template_purchase_${post.id}`)
          .setLabel('Purchase')
          .setStyle(ButtonStyle.Success)
          .setEmoji(EMOJIS.payment)
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`job_contact_${post.id}`)
        .setLabel(isTemplate ? 'Seller Info' : 'Contact')
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
  const isTemplate = post.type === 'template';
  const reportCount = Array.isArray(post.reports) ? post.reports.length : 0;
  const reviewCount = Array.isArray(post.reviews) ? post.reviews.length : 0;
  const applicationCount = Array.isArray(post.applications) ? post.applications.length : 0;
  const purchaseCount = Array.isArray(post.purchases) ? post.purchases.length : 0;
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
            `Category: **${categoryLabel(post.category, post.type)}**`,
            isTemplate ? `Price: **${post.price || 'Not specified'}**` : `Payment: **${paymentLabel(post.payment, post.type)}**`,
            isTemplate ? `Accepted payment: **${paymentLabel(post.payment, post.type)}**` : null,
            isTemplate ? `Built with: **${post.stack || 'Not specified'}**` : null,
            `Custom color: **${Number.isInteger(post.accentColor) ? `#${post.accentColor.toString(16).padStart(6, '0').toUpperCase()}` : 'None'}**`,
            `Status: **${statusLabel(post)}**`,
            `Verified: **${post.verified ? 'Yes' : 'No'}**`,
            `Reports: **${reportCount}** | Reviews: **${reviewCount}** | Applications: **${applicationCount}** | Purchases: **${purchaseCount}**`,
            `Public post: ${publicPostUrl(post)}`
          ].filter(Boolean).join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(`${isTemplate ? 'Payment instructions' : 'Contact'}: ${post.contact}`))
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
  const isTemplate = post.type === 'template';
  const meta = getTypeMeta(post.type);
  const container = new ContainerBuilder()
    .setAccentColor(Number.isInteger(post.accentColor) ? post.accentColor : meta.color);

  return [
    container
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.contact} ${isTemplate ? 'Seller Details' : 'Contact Details'}`),
        text(
          isTemplate
            ? [
                `Template: **${post.title}**`,
                `Category: **${categoryLabel(post.category, post.type)}**`,
                `Price: **${post.price || 'Not specified'}**`,
                `Built with: **${post.stack || 'Not specified'}**`,
                `Seller: <@${post.authorId}>`,
                '',
                'For buyer safety, use the **Purchase** button on the marketplace post. Payment instructions and delivery happen inside a private ticket.'
              ].join('\n')
            : [
                `Post: **${post.title}**`,
                `Category: **${categoryLabel(post.category, post.type)}**`,
                `Payment: **${paymentLabel(post.payment, post.type)}**`,
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

function buildTemplateAccessDeniedComponents() {
  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.report)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.cross || '<:cross:1430525603701850165>'} Marketplace Access Required`),
        text(
          [
            'You do not have the authorization required to sell custom templates in the MagicUI creator marketplace.',
            '',
            'This option is reserved for active creators, members who consistently showcase original work, and known contributors trusted by the community.'
          ].join('\n')
        )
      )
  ];
}

function purchaseStatusLabel(purchase) {
  if (purchase.closedAt) return 'Closed';
  if (purchase.deliveredAt) return 'Delivered';
  if (purchase.paymentConfirmedAt) return 'Payment confirmed';
  return 'Awaiting payment';
}

function buildTemplatePurchaseTicketComponents(post, purchase) {
  const confirmed = Boolean(purchase.paymentConfirmedAt);
  const delivered = Boolean(purchase.deliveredAt);
  const closed = Boolean(purchase.closedAt);

  return [
    new ContainerBuilder()
      .setAccentColor(CONFIG.colors.marketplace)
      .addTextDisplayComponents(
        text(`# ${EMOJI_TEXT.marketplace} Template Purchase Ticket`),
        text(
          [
            `Buyer: <@${purchase.buyerId}>`,
            `Seller: <@${purchase.sellerId}>`,
            `Template: **${post.title}**`,
            `Price: **${post.price || 'Not specified'}**`,
            `Payment method: **${paymentLabel(post.payment, post.type)}**`,
            `Built with: **${post.stack || 'Not specified'}**`,
            `Status: **${purchaseStatusLabel(purchase)}**`,
            `Opened: <t:${Math.floor(purchase.createdAt / 1000)}:R>`
          ].join('\n')
        )
      )
      .addSeparatorComponents(separator(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(
        text(`### Payment Instructions\n${post.contact}`),
        text(
          [
            '### Delivery Flow',
            'Buyer and seller can view this channel, but messages and file uploads stay locked until the seller confirms payment.',
            'After payment is confirmed, the channel unlocks so the seller can share files, links, licenses, and setup notes. Close the ticket when delivery is complete; a transcript will be saved.'
          ].join('\n')
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`template_purchase_confirm_${purchase.id}`)
            .setLabel(confirmed ? 'Payment Confirmed' : 'Confirm Payment')
            .setStyle(confirmed ? ButtonStyle.Secondary : ButtonStyle.Success)
            .setEmoji(EMOJIS.payment)
            .setDisabled(confirmed || closed),
          new ButtonBuilder()
            .setCustomId(`template_purchase_delivered_${purchase.id}`)
            .setLabel(delivered ? 'Delivered' : 'Mark Delivered')
            .setStyle(delivered ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setEmoji(EMOJIS.verified)
            .setDisabled(!confirmed || delivered || closed),
          new ButtonBuilder()
            .setCustomId(`template_purchase_transcript_${purchase.id}`)
            .setLabel('Transcript')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.review)
            .setDisabled(closed),
          new ButtonBuilder()
            .setCustomId(`template_purchase_close_${purchase.id}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(EMOJIS.report)
            .setDisabled(closed)
        )
      )
  ];
}

function buildTemplateTicketNoticeComponents(title, body, color = CONFIG.colors.marketplace) {
  return [
    new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(text(`# ${title}`), text(body))
  ];
}

function buildTemplateCloseConfirmComponents(purchase) {
  return [
    new ContainerBuilder()
      .setAccentColor(0xfaa61a)
      .addTextDisplayComponents(
        text('# Close Template Purchase Ticket'),
        text('Closing saves a transcript to the job board admin channel and deletes this private purchase ticket shortly after confirmation.')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`template_purchase_close_confirm_${purchase.id}`)
            .setLabel('Confirm Close')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`template_purchase_close_cancel_${purchase.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        )
      )
  ];
}

function buildTemplatePurchaseLogComponents(title, body, color = CONFIG.colors.marketplace, transcriptName = null) {
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

function buildJobSetupComponents(draft) {
  const meta = getTypeMeta(draft.type);
  const isTemplate = draft.type === 'template';
  const categoryOptions = categoryOptionsFor(draft.type);
  const paymentOptions = paymentOptionsFor(draft.type);
  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId(`job_setup_category_${draft.id}`)
    .setPlaceholder(draft.category ? `Category: ${categoryLabel(draft.category, draft.type)}` : (isTemplate ? 'Choose template type' : 'Choose the closest category'))
    .addOptions(
      ...categoryOptions.map(option =>
        new StringSelectMenuOptionBuilder()
          .setLabel(option.label)
          .setDescription(option.description)
          .setValue(option.value)
          .setDefault(option.value === draft.category)
      )
    );

  const paymentSelect = new StringSelectMenuBuilder()
    .setCustomId(`job_setup_payment_${draft.id}`)
    .setPlaceholder(draft.payment ? `Payment: ${paymentLabel(draft.payment, draft.type)}` : (isTemplate ? 'Choose accepted payment method' : 'Choose payment or compensation type'))
    .addOptions(
      ...paymentOptions.map(option =>
        new StringSelectMenuOptionBuilder()
          .setLabel(option.label)
          .setDescription(option.description)
          .setValue(option.value)
          .setDefault(option.value === draft.payment)
      )
    );

  return [
    new ContainerBuilder()
      .setAccentColor(isTemplate ? CONFIG.colors.marketplace : CONFIG.colors.panel)
      .addTextDisplayComponents(
        text(`# Create ${meta.label} Post`),
        text(
          [
            isTemplate
              ? 'Start with template type and accepted payment method. After that, the bot will collect price, tech stack, and private payment instructions.'
              : 'Start with category and payment. After that, the bot will open the post details form.',
            `Selected category: **${categoryLabel(draft.category, draft.type)}**`,
            `Selected payment: **${paymentLabel(draft.payment, draft.type)}**`
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
  const isTemplate = type === 'template';

  const title = new TextInputBuilder()
    .setCustomId('title')
    .setLabel(isTemplate ? 'Template title' : 'Post title')
    .setPlaceholder(isTemplate ? 'SaaS dashboard template for Next.js' : type === 'for_hire' ? 'UI designer available for commissions' : 'Hiring frontend developer')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(90);

  const body = new TextInputBuilder()
    .setCustomId('body')
    .setLabel(isTemplate ? 'Template details' : 'Main text')
    .setPlaceholder(isTemplate ? 'Describe pages, features, included files, license, support, and what makes it custom.' : 'Describe scope, skills, budget/rate, requirements, timeline, proof links, and expectations.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1800);

  if (isTemplate) {
    const price = new TextInputBuilder()
      .setCustomId('price')
      .setLabel('Price')
      .setPlaceholder('$49, $99, negotiable, or bundle price')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80);

    const stack = new TextInputBuilder()
      .setCustomId('stack')
      .setLabel('Stack and component libraries')
      .setPlaceholder('Next.js, React, Tailwind CSS, shadcn/ui, Magic UI, Framer Motion...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(500);

    const contact = new TextInputBuilder()
      .setCustomId('contact')
      .setLabel('Payment/contact instructions')
      .setPlaceholder('PayPal link, Stripe link, Discord contact, delivery note, or invoice instructions.')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(700);

    modal.addComponents(
      new ActionRowBuilder().addComponents(title),
      new ActionRowBuilder().addComponents(body),
      new ActionRowBuilder().addComponents(price),
      new ActionRowBuilder().addComponents(stack),
      new ActionRowBuilder().addComponents(contact)
    );

    return modal;
  }

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
  const isTemplate = draft.type === 'template';
  const accentText = Number.isInteger(draft.accentColor)
    ? `#${draft.accentColor.toString(16).padStart(6, '0').toUpperCase()}`
    : draft.requestedAccentColor && !draft.customColorAllowed
      ? 'Ignored - boosters/admins only'
      : 'None';

  return [
    new ContainerBuilder()
      .setAccentColor(isTemplate ? CONFIG.colors.marketplace : CONFIG.colors.panel)
      .addTextDisplayComponents(
        text(`# Review ${isTemplate ? 'Template Listing' : 'Job Post'} Draft`),
        text(
          [
            `${meta.emojiText} Type: **${meta.label}**`,
            `Title: **${draft.title}**`,
            `Category: **${categoryLabel(draft.category, draft.type)}**`,
            isTemplate ? `Price: **${draft.price || 'Not specified'}**` : `Payment: **${paymentLabel(draft.payment, draft.type)}**`,
            isTemplate ? `Accepted payment: **${paymentLabel(draft.payment, draft.type)}**` : null,
            isTemplate ? `Built with: **${draft.stack || 'Not specified'}**` : `Contact: ${draft.contact}`,
            `Accent color: **${accentText}**`
          ].filter(Boolean).join('\n')
        )
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(`### Description Preview\n${draft.body.slice(0, 900)}${draft.body.length > 900 ? '...' : ''}`)
      )
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(isTemplate
          ? 'Publish now, or add optional preview images/color first. Payment instructions stay inside private purchase tickets.'
          : 'Publish now, or add optional media/color first. Images and custom colors are optional.')
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
  addPurchase,
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
  buildTemplateAccessDeniedComponents,
  buildTemplateCloseConfirmComponents,
  buildTemplatePurchaseLogComponents,
  buildTemplatePurchaseTicketComponents,
  buildTemplateTicketNoticeComponents,
  canSellTemplates,
  canUseCustomPostColor,
  categoryLabel,
  cleanText,
  cleanTitle,
  createId,
  fetchTextChannel,
  getPost,
  getPurchase,
  getTypeMeta,
  isAdminMember,
  loadStore,
  normalizeHexColor,
  normalizeImageUrl,
  paymentLabel,
  purchaseStatusLabel,
  publicPostUrl,
  recoverPostFromMessage,
  saveStore,
  sendAdminHub,
  sendPublicPanel,
  updatePost,
  updatePurchase,
  updateReport
};
