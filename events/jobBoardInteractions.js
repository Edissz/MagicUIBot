const { MessageFlags } = require('discord.js');
const {
  CONFIG,
  addPost,
  addReport,
  autoPublish,
  buildAdminPostComponents,
  buildApplicationComponents,
  buildApplyModal,
  buildContactComponents,
  buildDraftPreviewComponents,
  buildJobMediaModal,
  buildJobPostModal,
  buildJobSetupComponents,
  buildPostComponents,
  buildReportComponents,
  buildReportModal,
  buildReviewModal,
  canUseCustomPostColor,
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
  sendAdminHub,
  sendPublicPanel,
  updatePost,
  updateReport
} = require('../utils/jobBoard');

const V2_FLAGS = MessageFlags.IsComponentsV2;
const EPHEMERAL_V2_FLAGS = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;
const SILENT_MENTIONS = { parse: [] };

async function sendError(interaction, err) {
  console.error('Job board interaction failed:', err);
  const payload = {
    content: '<:cross:1430525603701850165> Something went wrong while handling that job board action.',
    ephemeral: true
  };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ content: payload.content }).catch(() => null);
  }

  return interaction.reply(payload).catch(() => null);
}

function postIdFrom(customId, prefix) {
  return customId.slice(prefix.length);
}

function getDraftStore(client) {
  if (!client.__jobDrafts) client.__jobDrafts = new Map();
  return client.__jobDrafts;
}

function getOwnedDraft(interaction, client, draftId) {
  const draft = getDraftStore(client).get(draftId);
  if (!draft) return null;
  if (draft.authorId !== interaction.user.id && !isAdminMember(interaction.member)) return null;
  return draft;
}

async function updatePublicPostMessage(guild, post) {
  if (post.removed || !post.messageId) return false;

  const channel = await fetchTextChannel(guild, post.targetChannelId);
  if (!channel) return false;

  const message = await channel.messages.fetch(post.messageId).catch(() => null);
  if (!message) return false;

  await message.edit({
    components: buildPostComponents(post),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });

  return true;
}

async function syncAdminPostMessage(guild, post) {
  const channel = await fetchTextChannel(guild, CONFIG.adminChannelId);
  if (!channel) return post;

  if (post.adminMessageId) {
    const message = await channel.messages.fetch(post.adminMessageId).catch(() => null);
    if (message) {
      await message.edit({
        components: buildAdminPostComponents(post),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      });
      return post;
    }
  }

  const message = await channel.send({
    components: buildAdminPostComponents(post),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });

  return updatePost(post.id, stored => {
    stored.adminMessageId = message.id;
    return stored;
  }) || post;
}

async function syncPostMessages(guild, post) {
  await updatePublicPostMessage(guild, post).catch(err => console.error('Failed to update public job post:', err));
  return syncAdminPostMessage(guild, post).catch(err => {
    console.error('Failed to update admin job post:', err);
    return post;
  });
}

async function refreshCurrentReportCard(interaction, post) {
  const store = loadStore();
  const report = Object.values(store.reports).find(
    item => item.messageId === interaction.message?.id && item.channelId === interaction.channelId
  );
  if (!report) return;

  await interaction.message
    .edit({
      components: buildReportComponents(post, report),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    })
    .catch(() => null);
}

function createJobSetupDraft(interaction, client, type) {
  const draft = {
    id: createId('jd'),
    type,
    category: null,
    payment: null,
    title: null,
    body: null,
    contact: null,
    largeImageUrl: null,
    imageUrl: null,
    accentColor: null,
    requestedAccentColor: null,
    customColorAllowed: canUseCustomPostColor(interaction.member),
    authorId: interaction.user.id,
    authorTag: interaction.user.tag,
    createdAt: Date.now()
  };

  getDraftStore(client).set(draft.id, draft);
  return draft;
}

async function saveJobDraftDetails(interaction, client) {
  const draftId = postIdFrom(interaction.customId, 'job_post_modal_');
  const draft = getOwnedDraft(interaction, client, draftId);
  if (!draft) {
    return interaction.reply({
      content: '<:cross:1430525603701850165> That draft expired or belongs to someone else. Please start again from the job board panel.',
      ephemeral: true
    });
  }

  Object.assign(draft, {
    title: cleanTitle(interaction.fields.getTextInputValue('title')),
    body: cleanText(interaction.fields.getTextInputValue('body'), 1800),
    contact: cleanText(interaction.fields.getTextInputValue('contact'), 300),
    updatedAt: Date.now()
  });

  getDraftStore(client).set(draft.id, draft);

  return interaction.reply({
    components: buildDraftPreviewComponents(draft),
    flags: EPHEMERAL_V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });
}

async function updateDraftMedia(interaction, client) {
  const draftId = postIdFrom(interaction.customId, 'job_media_modal_');
  const draft = getOwnedDraft(interaction, client, draftId);
  if (!draft) {
    return interaction.reply({
      content: '<:cross:1430525603701850165> That draft expired or belongs to someone else. Please start again from the job board panel.',
      ephemeral: true
    });
  }

  const largeImageRaw = interaction.fields.getTextInputValue('large_image');
  const imageRaw = interaction.fields.getTextInputValue('image');
  const colorRaw = interaction.fields.getTextInputValue('accent_color');
  const requestedColor = normalizeHexColor(colorRaw);

  if (requestedColor === undefined) {
    return interaction.reply({
      content: '<:cross:1430525603701850165> The accent color must be a 6-digit hex value like `#06072C`, or left blank.',
      ephemeral: true
    });
  }

  draft.largeImageUrl = normalizeImageUrl(largeImageRaw);
  draft.imageUrl = normalizeImageUrl(imageRaw);
  draft.requestedAccentColor = Number.isInteger(requestedColor) ? requestedColor : null;
  draft.customColorAllowed = canUseCustomPostColor(interaction.member);
  draft.accentColor = draft.customColorAllowed && Number.isInteger(requestedColor) ? requestedColor : null;
  draft.updatedAt = Date.now();
  getDraftStore(client).set(draft.id, draft);

  const ignoredImages = [largeImageRaw, imageRaw].some(raw => {
    const cleaned = cleanText(raw, 500, '');
    return cleaned && !/^(n\/a|none|no|skip)$/i.test(cleaned) && !normalizeImageUrl(raw);
  })
    ? '\nOne optional image URL was invalid, so it was ignored.'
    : '';
  const ignoredColor = Number.isInteger(requestedColor) && !draft.customColorAllowed
    ? '\nCustom color was ignored because that perk is only for server boosters and admins.'
    : '';

  return interaction.reply({
    components: buildDraftPreviewComponents(draft),
    flags: EPHEMERAL_V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  }).then(() => {
    if (ignoredImages || ignoredColor) {
      return interaction.followUp({ content: `${ignoredImages}${ignoredColor}`.trim(), ephemeral: true }).catch(() => null);
    }
    return null;
  });
}

async function publishJobDraft(interaction, client, draft) {
  const type = draft.type;
  const meta = getTypeMeta(type);
  const targetChannel = await fetchTextChannel(interaction.guild, meta.channelId);
  if (!targetChannel) {
    return interaction.editReply('<:cross:1430525603701850165> I could not find the target job channel.');
  }

  const post = {
    id: createId('jp'),
    type,
    category: draft.category,
    payment: draft.payment,
    title: draft.title,
    body: draft.body,
    largeImageUrl: draft.largeImageUrl,
    imageUrl: draft.imageUrl,
    accentColor: draft.accentColor,
    requestedAccentColor: draft.requestedAccentColor,
    customColorAllowed: draft.customColorAllowed,
    contact: draft.contact,
    authorId: draft.authorId,
    authorTag: draft.authorTag,
    createdAt: Date.now(),
    targetChannelId: meta.channelId,
    status: 'open',
    verified: false,
    removed: false,
    reviews: [],
    reports: [],
    applications: []
  };

  const message = await targetChannel.send({
    components: buildPostComponents(post),
    flags: V2_FLAGS,
    allowedMentions: SILENT_MENTIONS
  });
  await autoPublish(message);

  post.messageId = message.id;

  const adminChannel = await fetchTextChannel(interaction.guild, CONFIG.adminChannelId);
  if (adminChannel) {
    const adminMessage = await adminChannel
      .send({
        components: buildAdminPostComponents(post),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      })
      .catch(err => {
        console.error('Failed to send job admin post card:', err);
        return null;
      });
    if (adminMessage) post.adminMessageId = adminMessage.id;
  }

  addPost(post);
  getDraftStore(client).delete(draft.id);

  return interaction.editReply(
    `<:check:1430525546608988203> Your ${meta.label.toLowerCase()} post is live: ${message.url}`
  );
}

async function handleReviewSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const postId = postIdFrom(interaction.customId, 'job_review_modal_');
  const rating = Number(interaction.fields.getTextInputValue('rating'));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return interaction.editReply('<:cross:1430525603701850165> Rating must be a whole number from 1 to 5.');
  }

  const review = {
    id: createId('rv'),
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    rating,
    body: cleanText(interaction.fields.getTextInputValue('body'), 500),
    createdAt: Date.now()
  };

  const post = updatePost(postId, stored => {
    if (!Array.isArray(stored.reviews)) stored.reviews = [];
    const existingIndex = stored.reviews.findIndex(item => item.userId === interaction.user.id);
    if (existingIndex >= 0) stored.reviews[existingIndex] = review;
    else stored.reviews.push(review);
    return stored;
  });

  if (!post) return interaction.editReply('<:cross:1430525603701850165> That job post no longer exists.');

  await syncPostMessages(interaction.guild, post);
  return interaction.editReply('<:check:1430525546608988203> Review saved and the job post was updated.');
}

async function handleReportSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const postId = postIdFrom(interaction.customId, 'job_report_modal_');
  const post = getPost(postId);
  if (!post || post.removed) {
    return interaction.editReply('<:cross:1430525603701850165> That job post is no longer available.');
  }

  const report = {
    id: createId('rp'),
    postId,
    reporterId: interaction.user.id,
    reporterTag: interaction.user.tag,
    reason: cleanText(interaction.fields.getTextInputValue('reason'), 1000),
    evidence: cleanText(interaction.fields.getTextInputValue('evidence'), 500, ''),
    createdAt: Date.now(),
    resolved: false
  };

  const saved = addReport(report);
  if (!saved) return interaction.editReply('<:cross:1430525603701850165> That job post no longer exists.');

  const reportChannel = await fetchTextChannel(interaction.guild, CONFIG.reportChannelId);
  if (reportChannel) {
    await reportChannel
      .send({
        content: `${CONFIG.staffRoleIds.map(roleId => `<@&${roleId}>`).join(' ')} New job board report.`,
        allowedMentions: { roles: CONFIG.staffRoleIds }
      })
      .catch(err => console.error('Failed to ping staff for job report:', err));

    const reportMessage = await reportChannel
      .send({
        components: buildReportComponents(saved.post, report),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      })
      .catch(err => {
        console.error('Failed to send job report card:', err);
        return null;
      });

    if (reportMessage) {
      updateReport(report.id, stored => {
        stored.channelId = reportMessage.channel.id;
        stored.messageId = reportMessage.id;
        return stored;
      });
    }
  }

  await syncAdminPostMessage(interaction.guild, saved.post);
  return interaction.editReply('<:check:1430525546608988203> Report sent to staff. Thank you for flagging it.');
}

async function handleApplySubmit(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const postId = postIdFrom(interaction.customId, 'job_apply_modal_');
  const post = getPost(postId);
  if (!post || post.removed || post.type !== 'hiring' || post.status !== 'open') {
    return interaction.editReply('<:cross:1430525603701850165> This opportunity is not open for applications.');
  }

  const application = {
    id: createId('app'),
    postId,
    applicantId: interaction.user.id,
    applicantTag: interaction.user.tag,
    contact: cleanText(interaction.fields.getTextInputValue('contact'), 300),
    portfolio: cleanText(interaction.fields.getTextInputValue('portfolio'), 500, ''),
    experience: cleanText(interaction.fields.getTextInputValue('experience'), 1000),
    availability: cleanText(interaction.fields.getTextInputValue('availability'), 250, ''),
    message: cleanText(interaction.fields.getTextInputValue('message'), 800),
    createdAt: Date.now()
  };

  const updatedPost = updatePost(postId, stored => {
    if (!Array.isArray(stored.applications)) stored.applications = [];
    stored.applications.push(application);
    return stored;
  });
  if (!updatedPost) return interaction.editReply('<:cross:1430525603701850165> That job post no longer exists.');

  await syncPostMessages(interaction.guild, updatedPost);

  let dmSent = false;
  const poster = await client.users.fetch(post.authorId).catch(() => null);
  if (poster) {
    dmSent = Boolean(
      await poster
        .send({
          components: buildApplicationComponents(updatedPost, application),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        })
        .then(() => true)
        .catch(() => false)
    );
  }

  const adminChannel = await fetchTextChannel(interaction.guild, CONFIG.adminChannelId);
  if (adminChannel) {
    await adminChannel
      .send({
        components: buildApplicationComponents(updatedPost, application),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      })
      .catch(() => null);
  }

  return interaction.editReply(
    dmSent
      ? '<:check:1430525546608988203> Application sent to the poster.'
      : '<:check:1430525546608988203> Application saved and sent to staff. The poster could not be DMed.'
  );
}

async function handleAdminAction(interaction) {
  if (interaction.customId === 'job_admin_send_panel') {
    await interaction.deferReply({ ephemeral: true });
    if (!isAdminMember(interaction.member)) {
      return interaction.editReply('<:cross:1430525603701850165> Only admins can use this control.');
    }

    const panel = await sendPublicPanel(interaction.guild);
    await sendAdminHub(interaction.guild, interaction.user);
    return interaction.editReply(`<:check:1430525546608988203> Public job board panel posted in ${panel.channel}.`);
  }

  const actionPrefixes = [
    'job_admin_verify_',
    'job_admin_fill_',
    'job_admin_close_',
    'job_admin_reopen_',
    'job_admin_delete_',
    'job_admin_restore_'
  ];
  const prefix = actionPrefixes.find(item => interaction.customId.startsWith(item));
  if (!prefix) return false;

  await interaction.deferReply({ ephemeral: true });
  if (!isAdminMember(interaction.member)) {
    return interaction.editReply('<:cross:1430525603701850165> Only admins can use this control.');
  }

  const postId = postIdFrom(interaction.customId, prefix);
  let post = getPost(postId);
  if (!post) return interaction.editReply('<:cross:1430525603701850165> That job post no longer exists.');

  if (prefix === 'job_admin_verify_') {
    post = updatePost(postId, stored => {
      stored.verified = !stored.verified;
      if (stored.verified) {
        stored.verifiedBy = interaction.user.id;
        stored.verifiedAt = Date.now();
      } else {
        delete stored.verifiedBy;
        delete stored.verifiedAt;
      }
      return stored;
    });
    await syncPostMessages(interaction.guild, post);
    await refreshCurrentReportCard(interaction, post);
    return interaction.editReply(
      post.verified
        ? '<:check:1430525546608988203> Post marked as a verified opportunity.'
        : '<:check:1430525546608988203> Verified badge removed from the post.'
    );
  }

  if (prefix === 'job_admin_fill_' || prefix === 'job_admin_close_' || prefix === 'job_admin_reopen_') {
    const nextStatus = prefix === 'job_admin_fill_' ? 'filled' : prefix === 'job_admin_close_' ? 'closed' : 'open';
    post = updatePost(postId, stored => {
      stored.status = nextStatus;
      stored.statusBy = interaction.user.id;
      stored.statusAt = Date.now();
      return stored;
    });
    await syncPostMessages(interaction.guild, post);
    return interaction.editReply(`<:check:1430525546608988203> Post status changed to ${nextStatus}.`);
  }

  if (prefix === 'job_admin_delete_') {
    post = updatePost(postId, stored => {
      stored.removed = true;
      stored.removedBy = interaction.user.id;
      stored.removedAt = Date.now();
      return stored;
    });

    const channel = await fetchTextChannel(interaction.guild, post.targetChannelId);
    const message = post.messageId && channel ? await channel.messages.fetch(post.messageId).catch(() => null) : null;
    if (message) await message.delete('Job board post taken down by staff').catch(() => null);

    await syncAdminPostMessage(interaction.guild, post);
    await refreshCurrentReportCard(interaction, post);
    return interaction.editReply('<:check:1430525546608988203> Post was taken down.');
  }

  if (prefix === 'job_admin_restore_') {
    const meta = getTypeMeta(post.type);
    const channel = await fetchTextChannel(interaction.guild, meta.channelId);
    if (!channel) return interaction.editReply('<:cross:1430525603701850165> I could not find the target channel.');

    const restoredDraft = {
      ...post,
      removed: false,
      status: 'open',
      targetChannelId: meta.channelId,
      restoredBy: interaction.user.id,
      restoredAt: Date.now()
    };
    const message = await channel.send({
      components: buildPostComponents(restoredDraft),
      flags: V2_FLAGS,
      allowedMentions: SILENT_MENTIONS
    });
    await autoPublish(message);

    post = updatePost(postId, stored => {
      stored.removed = false;
      stored.status = 'open';
      stored.targetChannelId = meta.channelId;
      stored.messageId = message.id;
      stored.restoredBy = interaction.user.id;
      stored.restoredAt = Date.now();
      return stored;
    });

    await syncAdminPostMessage(interaction.guild, post);
    return interaction.editReply(`<:check:1430525546608988203> Post restored: ${message.url}`);
  }

  return false;
}

async function handleReportResolve(interaction) {
  if (!interaction.customId.startsWith('job_report_resolve_')) return false;

  await interaction.deferReply({ ephemeral: true });
  if (!isAdminMember(interaction.member)) {
    return interaction.editReply('<:cross:1430525603701850165> Only admins can use this control.');
  }

  const reportId = postIdFrom(interaction.customId, 'job_report_resolve_');
  const report = updateReport(reportId, stored => {
    stored.resolved = true;
    stored.resolvedBy = interaction.user.id;
    stored.resolvedAt = Date.now();
    return stored;
  });

  if (!report) return interaction.editReply('<:cross:1430525603701850165> That report no longer exists.');

  const post = getPost(report.postId);
  if (post) {
    await interaction.message
      .edit({
        components: buildReportComponents(post, report),
        flags: V2_FLAGS,
        allowedMentions: SILENT_MENTIONS
      })
      .catch(() => null);
    await syncAdminPostMessage(interaction.guild, post);
  }

  return interaction.editReply('<:check:1430525546608988203> Report marked as reviewed.');
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (!interaction.guild) return;

      if (interaction.isStringSelectMenu() && interaction.customId === 'job_board_select') {
        const draft = createJobSetupDraft(interaction, client, interaction.values[0]);
        return interaction.reply({
          components: buildJobSetupComponents(draft),
          flags: EPHEMERAL_V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('job_setup_category_')) {
        const draftId = postIdFrom(interaction.customId, 'job_setup_category_');
        const draft = getOwnedDraft(interaction, client, draftId);
        if (!draft) {
          return interaction.reply({
            content: '<:cross:1430525603701850165> That draft expired or belongs to someone else. Please start again from the job board panel.',
            ephemeral: true
          });
        }
        draft.category = interaction.values[0];
        draft.updatedAt = Date.now();
        getDraftStore(client).set(draft.id, draft);
        return interaction.update({
          components: buildJobSetupComponents(draft),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('job_setup_payment_')) {
        const draftId = postIdFrom(interaction.customId, 'job_setup_payment_');
        const draft = getOwnedDraft(interaction, client, draftId);
        if (!draft) {
          return interaction.reply({
            content: '<:cross:1430525603701850165> That draft expired or belongs to someone else. Please start again from the job board panel.',
            ephemeral: true
          });
        }
        draft.payment = interaction.values[0];
        draft.updatedAt = Date.now();
        getDraftStore(client).set(draft.id, draft);
        return interaction.update({
          components: buildJobSetupComponents(draft),
          flags: V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_setup_details_')) {
        const draftId = postIdFrom(interaction.customId, 'job_setup_details_');
        const draft = getOwnedDraft(interaction, client, draftId);
        if (!draft) {
          return interaction.reply({
            content: '<:cross:1430525603701850165> That draft expired or belongs to someone else. Please start again from the job board panel.',
            ephemeral: true
          });
        }
        if (!draft.category || !draft.payment) {
          return interaction.reply({
            content: '<:cross:1430525603701850165> Please choose both category and payment first.',
            ephemeral: true
          });
        }
        return await interaction.showModal(buildJobPostModal(draft.id, draft.type));
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('job_post_modal_')) {
        return await saveJobDraftDetails(interaction, client);
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_draft_media_')) {
        const draftId = postIdFrom(interaction.customId, 'job_draft_media_');
        const draft = getOwnedDraft(interaction, client, draftId);
        if (!draft) {
          return interaction.reply({
            content: '<:cross:1430525603701850165> That draft expired or belongs to someone else. Please start again from the job board panel.',
            ephemeral: true
          });
        }
        return await interaction.showModal(buildJobMediaModal(draft.id));
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('job_media_modal_')) {
        return await updateDraftMedia(interaction, client);
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_draft_publish_')) {
        await interaction.deferReply({ ephemeral: true });
        const draftId = postIdFrom(interaction.customId, 'job_draft_publish_');
        const draft = getOwnedDraft(interaction, client, draftId);
        if (!draft) {
          return interaction.editReply('<:cross:1430525603701850165> That draft expired or belongs to someone else. Please start again from the job board panel.');
        }
        return await publishJobDraft(interaction, client, draft);
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_draft_cancel_')) {
        const draftId = postIdFrom(interaction.customId, 'job_draft_cancel_');
        const draft = getOwnedDraft(interaction, client, draftId);
        if (draft) getDraftStore(client).delete(draft.id);
        return interaction.reply({ content: '<:check:1430525546608988203> Draft cancelled.', ephemeral: true });
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_admin_')) {
        return await handleAdminAction(interaction);
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_report_resolve_')) {
        return await handleReportResolve(interaction);
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_contact_')) {
        const post = getPost(postIdFrom(interaction.customId, 'job_contact_'));
        if (!post || post.removed) {
          return interaction.reply({ content: '<:cross:1430525603701850165> That job post is no longer available.', ephemeral: true });
        }

        return interaction.reply({
          components: buildContactComponents(post),
          flags: EPHEMERAL_V2_FLAGS,
          allowedMentions: SILENT_MENTIONS
        });
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_review_')) {
        const post = getPost(postIdFrom(interaction.customId, 'job_review_'));
        if (!post || post.removed) {
          return interaction.reply({ content: '<:cross:1430525603701850165> That job post is no longer available.', ephemeral: true });
        }
        return await interaction.showModal(buildReviewModal(post.id));
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('job_review_modal_')) {
        return await handleReviewSubmit(interaction);
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_report_')) {
        const post = getPost(postIdFrom(interaction.customId, 'job_report_'));
        if (!post || post.removed) {
          return interaction.reply({ content: '<:cross:1430525603701850165> That job post is no longer available.', ephemeral: true });
        }
        return await interaction.showModal(buildReportModal(post.id));
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('job_report_modal_')) {
        return await handleReportSubmit(interaction);
      }

      if (interaction.isButton() && interaction.customId.startsWith('job_apply_')) {
        const post = getPost(postIdFrom(interaction.customId, 'job_apply_'));
        if (!post || post.removed || post.type !== 'hiring' || post.status !== 'open') {
          return interaction.reply({ content: '<:cross:1430525603701850165> This opportunity is not open for applications.', ephemeral: true });
        }
        return await interaction.showModal(buildApplyModal(post.id));
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('job_apply_modal_')) {
        return await handleApplySubmit(interaction, client);
      }
    } catch (err) {
      return sendError(interaction, err);
    }
  }
};
