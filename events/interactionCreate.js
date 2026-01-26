const {
  ChannelType,
  PermissionsBitField,
  MessageFlags,
  ContainerBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

const { BRAND_BLUE, registerTicketOpen, registerTicketClaim } = require("../utils/ticketStats");
const { saveTranscript, transcriptAttachment } = require("../utils/transcript");

const PANEL_CHANNEL_ID = "1405208521871724605";
const CATEGORY_ID = "1405640921017745419";
const LOG_ID = "1441524770083573770";

const ROLE_SUPPORT = "1405207645618700349";
const ROLE_MANAGEMENT = "1441080027113586841";
const ROLE_DEV = "1441079871911493693";

const REASONS = [
  { label: "Payment / Billing", value: "billing", desc: "Charges, invoices, upgrades, access" },
  { label: "Bug / Broken Component", value: "bug", desc: "Not working, errors, broken UI" },
  { label: "General Support", value: "general", desc: "How-to, setup, guidance" },
  { label: "Rule Violation Report", value: "report", desc: "Report rule-breaking" },
  { label: "Order / Product Issue", value: "order", desc: "Delivery, product, entitlement" },
  { label: "Voice Support Meeting", value: "voice", desc: "Request a voice session" },
];

function isStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  return member.roles.cache.has(ROLE_SUPPORT) || member.roles.cache.has(ROLE_MANAGEMENT) || member.roles.cache.has(ROLE_DEV);
}

function safeName(s) {
  return String(s || "ticket").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 18) || "ticket";
}

function getOwnerId(channel) {
  const m = (channel.topic || "").match(/OWNER:(\d{17,20})/);
  return m ? m[1] : null;
}

function getClaimedBy(channel) {
  const m = (channel.topic || "").match(/CLAIMED_BY:(\d{17,20})/);
  return m ? m[1] : null;
}

function setClaimedByTopic(topic, userId) {
  const t = topic || "";
  if (/CLAIMED_BY:\d{17,20}/.test(t)) return t.replace(/CLAIMED_BY:\d{17,20}/, `CLAIMED_BY:${userId}`);
  if (!t.trim()) return `CLAIMED_BY:${userId}`;
  return `${t} | CLAIMED_BY:${userId}`;
}

function v2Card(title, body) {
  const c = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  c.addTextDisplayComponents((t) => t.setContent(String(body || " ").trim() || " "));
  return c;
}

function ticketControlsContainer() {
  const c = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c.addTextDisplayComponents((t) => t.setContent(" "));
  c.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ticket_hold").setLabel("Hold").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_transfer").setLabel("Transfer").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Close").setStyle(ButtonStyle.Danger)
    )
  );
  return c;
}

function wizardComponents(selected) {
  const c1 = v2Card(
    "Contact Support",
    "Pick a reason below, then press **Continue**.\n\nYou’ll fill a short form after this."
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_wizard_reason")
    .setPlaceholder("Select a reason")
    .addOptions(
      REASONS.map((r) => ({
        label: r.label,
        value: r.value,
        description: r.desc,
      }))
    );

  const rowMenu = new ActionRowBuilder().addComponents(menu);

  const btn = new ButtonBuilder()
    .setCustomId("ticket_wizard_continue")
    .setLabel("Continue")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!selected);

  const rowBtn = new ActionRowBuilder().addComponents(btn);

  return [c1, rowMenu, rowBtn];
}

function ensureWizardStore(client) {
  if (!client.__ticketWizard) client.__ticketWizard = new Map();
  return client.__ticketWizard;
}

function ensureFeedbackStore(client) {
  if (!client.__ticketFeedback) client.__ticketFeedback = {};
  return client.__ticketFeedback;
}

async function logEmbed(guild, embed, file) {
  const ch = guild.channels.cache.get(LOG_ID) || (await guild.channels.fetch(LOG_ID).catch(() => null));
  if (!ch || !ch.isTextBased()) return;
  const payload = file ? { embeds: [embed], files: [file] } : { embeds: [embed] };
  await ch.send(payload).catch(() => null);
}

async function finalizeClose(channel, client, opts) {
  const guild = channel.guild;
  const ownerId = getOwnerId(channel);
  const claimedBy = getClaimedBy(channel);

  const transcript = await saveTranscript(channel).catch(() => "");
  const file = transcript ? transcriptAttachment(channel.id, transcript) : null;

  const embed = new EmbedBuilder()
    .setTitle("Ticket Closed")
    .setColor(0x0b2a6f)
    .setDescription(
      `**Channel:** #${channel.name} (${channel.id})\n` +
      `**Owner:** ${ownerId ? `<@${ownerId}> (${ownerId})` : "N/A"}\n` +
      `**Claimed By:** ${claimedBy ? `<@${claimedBy}> (${claimedBy})` : "Unclaimed"}\n` +
      `**Closed By:** ${opts.closedByTag} (${opts.closedById})\n` +
      `**Rating:** ${opts.rating || "N/A"}\n` +
      `**Wants Transcript:** ${opts.wantsTranscript ? "Yes" : "No"}\n` +
      `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
    )
    .setTimestamp();

  await logEmbed(guild, embed, file);

  if (opts.wantsTranscript && ownerId && file) {
    const user = await client.users.fetch(ownerId).catch(() => null);
    if (user) {
      await user.send({ content: "Here is your MagicUI ticket transcript:", files: [file] }).catch(() => null);
    }
  }

  const closeMsg = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  closeMsg.addTextDisplayComponents((t) => t.setContent("**Ticket Closing**"));
  closeMsg.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  closeMsg.addTextDisplayComponents((t) =>
    t.setContent("Transcript saved. This channel will be deleted in a few seconds.")
  );

  await channel.send({ components: [closeMsg], flags: MessageFlags.IsComponentsV2 }).catch(() => null);

  setTimeout(async () => {
    await channel.delete("Ticket closed").catch(() => null);
  }, 6000);
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isButton() && interaction.customId === "ticket_start") {
        const store = ensureWizardStore(client);
        store.set(interaction.user.id, { reason: null });

        return interaction.reply({
          components: wizardComponents(null),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_wizard_reason") {
        const store = ensureWizardStore(client);
        const state = store.get(interaction.user.id) || { reason: null };
        state.reason = interaction.values[0];
        store.set(interaction.user.id, state);

        return interaction.update({
          components: wizardComponents(state.reason),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      if (interaction.isButton() && interaction.customId === "ticket_wizard_continue") {
        const store = ensureWizardStore(client);
        const state = store.get(interaction.user.id);
        if (!state?.reason) {
          return interaction.reply({
            components: [v2Card("Missing Reason", "Select a reason first.")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const modal = new ModalBuilder().setCustomId("ticket_modal_create").setTitle("Submit Ticket");

        const issue = new TextInputBuilder()
          .setCustomId("t_issue")
          .setLabel("Describe your issue")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);

        const tried = new TextInputBuilder()
          .setCustomId("t_tried")
          .setLabel("Steps you tried")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(800);

        const license = new TextInputBuilder()
          .setCustomId("t_license")
          .setLabel("License type (Free or Pro)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(30);

        const email = new TextInputBuilder()
          .setCustomId("t_email")
          .setLabel("Email (optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(80);

        modal.addComponents(
          new ActionRowBuilder().addComponents(issue),
          new ActionRowBuilder().addComponents(tried),
          new ActionRowBuilder().addComponents(license),
          new ActionRowBuilder().addComponents(email)
        );

        return interaction.showModal(modal);
      }

      if (interaction.isModalSubmit() && interaction.customId === "ticket_modal_create") {
        const store = ensureWizardStore(client);
        const state = store.get(interaction.user.id);
        const reason = state?.reason || "general";

        await interaction.reply({
          components: [v2Card("Creating Ticket", "Please wait…")],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        const guild = interaction.guild;
        if (!guild) return;

        const parent = guild.channels.cache.get(CATEGORY_ID) || (await guild.channels.fetch(CATEGORY_ID).catch(() => null));
        if (!parent) {
          return interaction.editReply({
            components: [v2Card("Error", "Ticket category not found. Contact an admin.")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const issue = interaction.fields.getTextInputValue("t_issue");
        const tried = interaction.fields.getTextInputValue("t_tried");
        const license = interaction.fields.getTextInputValue("t_license");
        const email = (interaction.fields.getTextInputValue("t_email") || "").trim();

        const base = safeName(interaction.user.username);
        const chName = `ticket-${base}-${reason}`.slice(0, 95);

        const overwrites = [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: ROLE_SUPPORT, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
          { id: ROLE_MANAGEMENT, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
          { id: ROLE_DEV, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
        ];

        const channel = await guild.channels.create({
          name: chName,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: overwrites,
          reason: `Ticket created by ${interaction.user.tag} (${interaction.user.id})`,
        });

        await channel.setTopic(`OWNER:${interaction.user.id} | TYPE:${reason}`).catch(() => null);
        registerTicketOpen(client, channel);

        const reasonLabel = REASONS.find((r) => r.value === reason)?.label || reason;

        const open = new ContainerBuilder().setAccentColor(BRAND_BLUE);
        open.addTextDisplayComponents((t) => t.setContent("**MagicUI Support Ticket**"));
        open.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        open.addTextDisplayComponents((t) =>
          t.setContent(
            `**User:** ${interaction.user.tag} \`(${interaction.user.id})\`\n` +
            `**Reason:** ${reasonLabel}\n` +
            `**License:** ${license}\n` +
            `**Email:** ${email || "N/A"}\n\n` +
            `**Issue:**\n${issue}\n\n` +
            `**Steps Tried:**\n${tried}\n\n` +
            `A staff member will respond soon. Please don’t spam.`
          )
        );

        await channel.send({
          components: [open, ticketControlsContainer()],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });

        await channel.send({
          content: `<@${interaction.user.id}> <@&${ROLE_SUPPORT}> <@&${ROLE_MANAGEMENT}> <@&${ROLE_DEV}>`,
          allowedMentions: { users: [interaction.user.id], roles: [ROLE_SUPPORT, ROLE_MANAGEMENT, ROLE_DEV] },
        }).catch(() => null);

        try {
          await interaction.user.send(`✅ Your ticket has been created: ${channel.toString()}`);
        } catch { }

        const log = new EmbedBuilder()
          .setTitle("Ticket Created")
          .setColor(0x0b2a6f)
          .setDescription(
            `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
            `**Channel:** ${channel.toString()} (${channel.id})\n` +
            `**Reason:** ${reasonLabel}\n` +
            `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setTimestamp();

        await logEmbed(guild, log);

        store.delete(interaction.user.id);

        return interaction.editReply({
          components: [v2Card("Ticket Created", `Created ${channel.toString()} successfully.`)],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isButton() && /^ticket_(claim|hold|transfer|close)$/.test(interaction.customId)) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel || channel.type !== ChannelType.GuildText) return;

        const ownerId = getOwnerId(channel);
        if (!ownerId) {
          return interaction.reply({ components: [v2Card("Error", "Ticket owner not found.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        if (interaction.customId !== "ticket_close" && !isStaff(interaction.member)) {
          return interaction.reply({ components: [v2Card("No Access", "Staff only.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        if (interaction.customId === "ticket_transfer") {
          const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_transfer_select")
            .setPlaceholder("Select a team")
            .addOptions(
              { label: "Customer Support Team", value: "support" },
              { label: "Management Team", value: "management" },
              { label: "Development Team", value: "dev" }
            );

          return interaction.reply({
            components: [v2Card("Transfer Ticket", "Pick which team should handle this ticket."), new ActionRowBuilder().addComponents(menu)],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (interaction.customId === "ticket_claim") {
          const already = getClaimedBy(channel);
          if (already) {
            return interaction.reply({
              components: [v2Card("Already Claimed", `This ticket is already claimed by <@${already}>.`)],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
          }

          await channel.setTopic(setClaimedByTopic(channel.topic || `OWNER:${ownerId}`, interaction.user.id)).catch(() => null);
          await channel.setName(`📥｜claimed-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, "")}`.slice(0, 95)).catch(() => null);

          await channel.send({
            components: [v2Card("Ticket Claimed", `Claimed by ${interaction.user.tag}. Support will continue here.`)],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => null);

          await registerTicketClaim(client, channel);

          const log = new EmbedBuilder()
            .setTitle("Ticket Claimed")
            .setColor(0x0b2a6f)
            .setDescription(
              `**Channel:** ${channel.toString()} (${channel.id})\n` +
              `**Claimed By:** ${interaction.user.tag} (${interaction.user.id})\n` +
              `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setTimestamp();

          await logEmbed(guild, log);

          return interaction.reply({
            components: [v2Card("Claimed", "Ticket claimed successfully.")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (interaction.customId === "ticket_hold") {
          await channel.setName(`⏸️｜hold-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, "")}`.slice(0, 95)).catch(() => null);

          await channel.send({
            components: [v2Card("Ticket On Hold", `Put on hold by ${interaction.user.tag}.`)],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => null);

          const log = new EmbedBuilder()
            .setTitle("Ticket On Hold")
            .setColor(0x0b2a6f)
            .setDescription(
              `**Channel:** ${channel.toString()} (${channel.id})\n` +
              `**By:** ${interaction.user.tag} (${interaction.user.id})\n` +
              `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setTimestamp();

          await logEmbed(guild, log);

          return interaction.reply({
            components: [v2Card("On Hold", "Ticket marked on hold.")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (interaction.customId === "ticket_close") {
          const confirm = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ticket_close_confirm").setLabel("Confirm Close").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
          );

          return interaction.reply({
            components: [v2Card("Close Ticket", "Are you sure you want to close this ticket?"), confirm],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_transfer_select") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel) return;

        if (!isStaff(interaction.member)) {
          return interaction.reply({ components: [v2Card("No Access", "Staff only.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        const value = interaction.values[0];
        const roleId = value === "support" ? ROLE_SUPPORT : value === "management" ? ROLE_MANAGEMENT : ROLE_DEV;
        const label = value === "support" ? "Customer Support Team" : value === "management" ? "Management Team" : "Development Team";

        await channel.send({
          content: `<@&${roleId}> Ticket transferred to **${label}** by ${interaction.user.tag}.`,
          allowedMentions: { roles: [roleId] },
        }).catch(() => null);

        const log = new EmbedBuilder()
          .setTitle("Ticket Transferred")
          .setColor(0x0b2a6f)
          .setDescription(
            `**Channel:** ${channel.toString()} (${channel.id})\n` +
            `**To:** ${label}\n` +
            `**By:** ${interaction.user.tag} (${interaction.user.id})\n` +
            `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setTimestamp();

        await logEmbed(guild, log);

        return interaction.update({
          components: [v2Card("Transferred", `Transferred to ${label}.`)],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isButton() && (interaction.customId === "ticket_close_confirm" || interaction.customId === "ticket_close_cancel")) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel) return;

        if (interaction.customId === "ticket_close_cancel") {
          return interaction.update({
            components: [v2Card("Cancelled", "Ticket closure cancelled.")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const ownerId = getOwnerId(channel);
        if (!ownerId) {
          return interaction.update({ components: [v2Card("Error", "Ticket owner not found.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        const fb = ensureFeedbackStore(client);
        fb[channel.id] = {
          rating: null,
          feedback: null,
          wantsTranscript: false,
          closedById: interaction.user.id,
          closedByTag: interaction.user.tag,
        };

        await channel.send({
          content: `<@${ownerId}>`,
          allowedMentions: { users: [ownerId] },
        }).catch(() => null);

        const rateCard = new ContainerBuilder().setAccentColor(BRAND_BLUE);
        rateCard.addTextDisplayComponents((t) => t.setContent("**Rate Your Support**"));
        rateCard.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        rateCard.addTextDisplayComponents((t) =>
          t.setContent("Choose a rating from **1** (poor) to **5** (excellent).")
        );
        rateCard.addActionRowComponents((row) =>
          row.setComponents(
            new ButtonBuilder().setCustomId("ticket_rate_1").setLabel("1").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_2").setLabel("2").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_3").setLabel("3").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_4").setLabel("4").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_5").setLabel("5").setStyle(ButtonStyle.Success)
          )
        );

        await channel.send({ components: [rateCard], flags: MessageFlags.IsComponentsV2 }).catch(() => null);

        return interaction.update({
          components: [v2Card("Closing Started", "Rating request sent to the ticket owner.")],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isButton() && /^ticket_rate_[1-5]$/.test(interaction.customId)) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel) return;

        const ownerId = getOwnerId(channel);
        if (!ownerId || interaction.user.id !== ownerId) {
          return interaction.reply({ components: [v2Card("No Access", "Only the ticket owner can rate.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        const rating = parseInt(interaction.customId.split("_")[2], 10);
        const fb = ensureFeedbackStore(client);
        if (!fb[channel.id]) fb[channel.id] = {};
        fb[channel.id].rating = rating;

        if (rating <= 4) {
          const modal = new ModalBuilder().setCustomId("ticket_feedback_modal").setTitle("Help Us Improve");
          const input = new TextInputBuilder()
            .setCustomId("fb_text")
            .setLabel("What could we improve?")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(800);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_transcript_yes").setLabel("Send transcript").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ticket_transcript_no").setLabel("No transcript").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
          components: [v2Card("Almost Done", "Do you want a transcript after closing?"), row],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isModalSubmit() && interaction.customId === "ticket_feedback_modal") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel) return;

        const ownerId = getOwnerId(channel);
        if (!ownerId || interaction.user.id !== ownerId) {
          return interaction.reply({ components: [v2Card("No Access", "Only the ticket owner can submit feedback.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        const text = interaction.fields.getTextInputValue("fb_text");
        const fb = ensureFeedbackStore(client);
        if (!fb[channel.id]) fb[channel.id] = {};
        fb[channel.id].feedback = text;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_transcript_yes").setLabel("Send transcript").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ticket_transcript_no").setLabel("No transcript").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
          components: [v2Card("Thanks", "Do you want a transcript after closing?"), row],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isButton() && (interaction.customId === "ticket_transcript_yes" || interaction.customId === "ticket_transcript_no")) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel) return;

        const ownerId = getOwnerId(channel);
        if (!ownerId || interaction.user.id !== ownerId) {
          return interaction.reply({ components: [v2Card("No Access", "Only the ticket owner can choose this.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        const fb = ensureFeedbackStore(client);
        const data = fb[channel.id] || {};
        data.wantsTranscript = interaction.customId === "ticket_transcript_yes";
        fb[channel.id] = data;

        await interaction.reply({
          components: [v2Card("Closing", "Closing ticket now…")],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        const rating = data.rating || null;
        const feedback = data.feedback || null;

        await channel.setName(`✅｜closed-${channel.name.replace(/^📥｜|⏸️｜|✅｜/g, "")}`.slice(0, 95)).catch(() => null);

        if (rating) {
          const summary = v2Card(
            "Ticket Closed",
            `**Rating:** ${rating}/5\n` + (feedback ? `**Feedback:** ${feedback}` : "")
          );
          await channel.send({ components: [summary], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
        }

        await finalizeClose(channel, client, {
          closedById: data.closedById || interaction.user.id,
          closedByTag: data.closedByTag || interaction.user.tag,
          rating,
          wantsTranscript: data.wantsTranscript,
        });

        delete fb[channel.id];
        return;
      }
    } catch (err) {
      console.error("ticket interaction error:", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            components: [v2Card("Error", "⚠️ Something went wrong.")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }
      } catch { }
    }
  },
};
