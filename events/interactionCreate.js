const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  ContainerBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

const { saveTranscript } = require("../utils/transcript");
const { registerTicketOpen, registerTicketClaim } = require("../utils/ticketStats");

const CATEGORY_ID = "1405640921017745419";
const ADMIN_LOG_ID = "1441524770083573770";

const ROLE_SUPPORT = "1405207645618700349";
const ROLE_MANAGEMENT = "1441080027113586841";
const ROLE_DEV = "1441079871911493693";

const STAFF_ROLE_NAMES = ["Moderator", "Administrator", "Manager"];
const KOFI_URL = "https://ko-fi.com/summary/984bdf5c-a724-4489-b324-9f44d2d85f1e";

const REASONS = [
  { value: "payment", label: "Payment Issue", description: "Problems with billing, refunds, or failed transactions." },
  { value: "bug", label: "Bug Report & Technical Support", description: "Report broken components, glitches, or errors." },
  { value: "general", label: "General Support", description: "Help or questions not listed above." },
  { value: "rule", label: "Rule Violation", description: "Report a user breaking rules or terms." },
  { value: "order", label: "Order / Product Issue", description: "Purchase, delivery, or product issues." },
];

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return member.roles.cache.some(
    (r) => r.id === ROLE_SUPPORT || r.id === ROLE_MANAGEMENT || r.id === ROLE_DEV || STAFF_ROLE_NAMES.includes(r.name)
  );
}

function parseTopic(topic) {
  const t = String(topic || "");
  const get = (key) => {
    const m = t.match(new RegExp(`${key}:(\\d{17,20}|\\S+)`));
    return m ? m[1] : null;
  };
  return {
    ownerId: get("OWNER"),
    type: get("TYPE"),
    claimedBy: get("CLAIMED_BY"),
    team: get("TEAM"),
  };
}

function ensureStore(client, guildId) {
  if (!client.__tickets) client.__tickets = {};
  if (!client.__tickets[guildId]) client.__tickets[guildId] = {};
  return client.__tickets[guildId];
}

function card(title, body, accent) {
  const c = new ContainerBuilder();
  if (accent) c.setAccentColor(accent);

  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const safe = String(body || "").trim();
  c.addTextDisplayComponents((t) => t.setContent(safe.length ? safe : " "));
  return c;
}

async function adminLog(guild, payload) {
  const ch = guild.channels.cache.get(ADMIN_LOG_ID) || (await guild.channels.fetch(ADMIN_LOG_ID).catch(() => null));
  if (!ch || !ch.isTextBased()) return;
  await ch.send(payload).catch(() => null);
}

function cleanName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14) || "user";
}

function baseName(name) {
  return String(name || "").replace(/^claimed-/, "").replace(/^hold-/, "").replace(/^closed-/, "");
}

async function finalizeClose(interaction, channel, client) {
  const guild = interaction.guild;
  if (!guild || !channel) return;

  const topic = parseTopic(channel.topic || "");
  const store = ensureStore(client, guild.id);
  const data = store[channel.id] || {};
  const ownerId = topic.ownerId;

  const transcriptText = await saveTranscript(channel);
  const file = new AttachmentBuilder(Buffer.from(transcriptText, "utf-8"), { name: `transcript-${channel.id}.txt` });

  const lines = [];
  lines.push(`**Channel:** ${channel.toString()} (${channel.id})`);
  if (ownerId) lines.push(`**Owner:** <@${ownerId}> (${ownerId})`);
  if (topic.type) lines.push(`**Type:** ${topic.type}`);
  if (topic.claimedBy) lines.push(`**Claimed By:** <@${topic.claimedBy}> (${topic.claimedBy})`);
  if (topic.team) lines.push(`**Team:** ${topic.team}`);
  if (data.closedBy) lines.push(`**Closed By:** ${data.closedBy}`);
  lines.push(`**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`);

  if (data.issue) lines.push(`\n**Issue:**\n${String(data.issue).slice(0, 1200)}`);
  if (data.tried) lines.push(`\n**Steps Tried:**\n${String(data.tried).slice(0, 1200)}`);
  if (data.plan) lines.push(`\n**License:** ${String(data.plan).slice(0, 200)}`);
  if (data.notes) lines.push(`\n**Notes:** ${String(data.notes).slice(0, 600)}`);
  if (data.rating) lines.push(`\n**Rating:** ${data.rating}/5`);
  if (data.feedback) lines.push(`**Feedback:** ${String(data.feedback).slice(0, 900)}`);

  await channel
    .send({
      components: [card("Ticket Closed", "This ticket is now closed. A transcript has been saved and the channel will be deleted shortly.", 0xed4245)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    })
    .catch(() => null);

  await adminLog(guild, {
    components: [card("Ticket Closed (Admin Log)", lines.join("\n"), 0x2b2d31)],
    files: [file],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });

  if (ownerId && data.wantsTranscript) {
    const user = await client.users.fetch(ownerId).catch(() => null);
    if (user) {
      await user
        .send({
          components: [card("Your Ticket Transcript", "Here is the transcript for your closed MagicUI support ticket.", 0x2b2d31)],
          files: [file],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        })
        .catch(() => null);
    }
  }

  delete store[channel.id];

  setTimeout(async () => {
    try { await channel.delete("Ticket closed"); } catch { }
  }, 7000);

  try {
    await interaction.editReply({
      components: [card("Done", "Thanks! Closing the ticket now.", 0x2b2d31)],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch { }
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      const id = interaction.customId || "";
      const isTicket =
        id === "ticket_contact" ||
        id === "ticket_reason_select" ||
        id.startsWith("ticket_modal_") ||
        /^ticket_(claim|hold|transfer|close|close_confirm|close_cancel|rate_[1-5]|transcript_yes|transcript_no)$/.test(id) ||
        id === "ticket_transfer_select" ||
        id === "ticket_feedback_modal";

      if (!isTicket) return;

      if (interaction.isButton() && interaction.customId === "ticket_contact") {
        const c = card(
          "Contact Support",
          "Select the reason for your ticket below. After selection, you’ll fill out a short form.",
          0x5865f2
        );

        c.addActionRowComponents((row) =>
          row.setComponents(
            new StringSelectMenuBuilder()
              .setCustomId("ticket_reason_select")
              .setPlaceholder("Select a reason")
              .addOptions(REASONS.map((r) => ({ label: r.label, value: r.value, description: r.description })))
          )
        );

        return interaction.reply({
          ephemeral: true,
          components: [c],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_reason_select") {
        const reason = interaction.values[0];

        const modal = new ModalBuilder().setCustomId(`ticket_modal_${reason}`).setTitle("Support Ticket Form");

        const issue = new TextInputBuilder()
          .setCustomId("issue_details")
          .setLabel("Describe your issue")
          .setPlaceholder("Explain what happened and what you need help with.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);

        const steps = new TextInputBuilder()
          .setCustomId("steps_taken")
          .setLabel("Steps you tried")
          .setPlaceholder("List anything you already tried to fix it.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(800);

        const plan = new TextInputBuilder()
          .setCustomId("license_type")
          .setLabel("License Type (optional)")
          .setPlaceholder("Free / Pro (optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(30);

        const notes = new TextInputBuilder()
          .setCustomId("extra_notes")
          .setLabel("Additional Notes (optional)")
          .setPlaceholder("Any extra context or links.")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200);

        modal.addComponents(
          new ActionRowBuilder().addComponents(issue),
          new ActionRowBuilder().addComponents(steps),
          new ActionRowBuilder().addComponents(plan),
          new ActionRowBuilder().addComponents(notes)
        );

        return interaction.showModal(modal);
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        if (!guild) return interaction.editReply({ content: "⚠️ Server context required." });

        const type = interaction.customId.replace("ticket_modal_", "");
        const issue = interaction.fields.getTextInputValue("issue_details");
        const tried = interaction.fields.getTextInputValue("steps_taken");
        const plan = interaction.fields.getTextInputValue("license_type") || "";
        const notes = interaction.fields.getTextInputValue("extra_notes") || "";

        const me = await guild.members.fetchMe().catch(() => null);
        if (!me || !me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
          return interaction.editReply({ content: "⚠️ I need Manage Channels permission to create ticket channels." });
        }

        const category = await guild.channels.fetch(CATEGORY_ID).catch(() => null);
        if (!category) return interaction.editReply({ content: "⚠️ Ticket category not found." });

        const uname = cleanName(interaction.user.username);
        const channelName = `ticket-${uname}-${type}`;

        const overwrites = [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: ROLE_SUPPORT, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
          { id: ROLE_MANAGEMENT, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
          { id: ROLE_DEV, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
        ];

        const ch = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: overwrites,
          reason: `Ticket created by ${interaction.user.tag} (${interaction.user.id})`,
        });

        await ch.setTopic(`OWNER:${interaction.user.id} | TYPE:${type}`).catch(() => null);

        registerTicketOpen(client, ch);

        const store = ensureStore(client, guild.id);
        store[ch.id] = {
          userId: interaction.user.id,
          type,
          issue,
          tried,
          plan,
          notes,
          rating: null,
          feedback: null,
          wantsTranscript: false,
          closedBy: null,
        };

        const ticketBody =
          `A new support ticket has been opened.\n\n` +
          `**Submitted by:** ${interaction.user} \`(${interaction.user.id})\`\n` +
          `**Ticket Type:** \`${type}\`\n\n` +
          `**Issue Details:**\n${issue}\n\n` +
          `**Steps Tried:**\n${tried}\n\n` +
          `**License Type:**\n${plan && plan.trim().length ? plan : "N/A"}\n\n` +
          `**Additional Notes:**\n${notes && notes.trim().length ? notes : "N/A"}\n\n` +
          `A staff member will review your issue shortly. Please avoid tagging staff members unless necessary.`;

        const c = new ContainerBuilder().setAccentColor(0xed4245);
        c.addTextDisplayComponents((t) => t.setContent("**Magic UI Support Ticket**"));
        c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        c.addTextDisplayComponents((t) => t.setContent(ticketBody));

        c.addActionRowComponents((row) =>
          row.setComponents(
            new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim Ticket").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("ticket_hold").setLabel("Put On Hold").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_transfer").setLabel("Transfer Ticket").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
          )
        );

        await ch.send({
          content: `${interaction.user} <@&${ROLE_SUPPORT}> <@&${ROLE_MANAGEMENT}> <@&${ROLE_DEV}>`,
          components: [c],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [interaction.user.id], roles: [ROLE_SUPPORT, ROLE_MANAGEMENT, ROLE_DEV] },
        });

        await adminLog(guild, {
          components: [card("Ticket Created (Admin Log)", `**User:** ${interaction.user.tag} (${interaction.user.id})\n**Channel:** ${ch.toString()} (${ch.id})\n**Type:** ${type}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n**Issue:**\n${issue.slice(0, 1200)}\n\n**Steps Tried:**\n${tried.slice(0, 1200)}`, 0x2b2d31)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });

        try {
          await interaction.user.send({
            components: [card("Ticket Created", `Your support ticket has been created: ${ch.toString()}\nA staff member will assist you soon.`, 0x2b2d31)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
          });
        } catch { }

        return interaction.editReply({ content: `✅ Ticket opened: ${ch.toString()}` });
      }

      if (interaction.isButton() && interaction.customId === "ticket_claim") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true });

        const meta = parseTopic(channel.topic || "");
        if (meta.claimedBy) return interaction.reply({ content: `⚠️ Already claimed by <@${meta.claimedBy}>.`, ephemeral: true });

        const base = baseName(channel.name);
        await channel.setName(`claimed-${base}`).catch(() => null);

        const topic = channel.topic || "";
        const newTopic = topic.includes("CLAIMED_BY:") ? topic.replace(/CLAIMED_BY:\S+/, `CLAIMED_BY:${interaction.user.id}`) : `${topic} | CLAIMED_BY:${interaction.user.id}`;
        await channel.setTopic(newTopic).catch(() => null);

        await channel.send({
          components: [card("Ticket Claimed", `This ticket has been claimed by ${interaction.user}.`, 0x2ecc71)],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => null);

        await registerTicketClaim(client, channel);

        await adminLog(guild, {
          components: [card("Ticket Claimed (Admin Log)", `**Channel:** ${channel.toString()} (${channel.id})\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, 0x2b2d31)],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.reply({ content: "✅ Claimed.", ephemeral: true });
      }

      if (interaction.isButton() && interaction.customId === "ticket_hold") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true });

        const base = baseName(channel.name);
        await channel.setName(`hold-${base}`).catch(() => null);

        await channel.send({
          components: [card("Ticket On Hold", `This ticket has been put on hold by ${interaction.user}.`, 0xf1c40f)],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => null);

        await adminLog(guild, {
          components: [card("Ticket On Hold (Admin Log)", `**Channel:** ${channel.toString()} (${channel.id})\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, 0x2b2d31)],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.reply({ content: "⏸️ On hold.", ephemeral: true });
      }

      if (interaction.isButton() && interaction.customId === "ticket_transfer") {
        const channel = interaction.channel;
        if (!channel) return;

        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true });

        const c = card("Transfer Ticket", "Select which team should take over this ticket.", 0x5865f2);
        c.addActionRowComponents((row) =>
          row.setComponents(
            new StringSelectMenuBuilder()
              .setCustomId("ticket_transfer_select")
              .setPlaceholder("Select a team")
              .addOptions(
                { label: "Customer Support Team", value: "support", description: "Transfer to Customer Support" },
                { label: "Management Team", value: "management", description: "Transfer to Management" },
                { label: "Development Team", value: "dev", description: "Transfer to Development" }
              )
          )
        );

        return interaction.reply({ ephemeral: true, components: [c], flags: MessageFlags.IsComponentsV2 });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_transfer_select") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true });

        const value = interaction.values[0];
        let roleId = null;
        let label = "";

        if (value === "support") { roleId = ROLE_SUPPORT; label = "Customer Support Team"; }
        if (value === "management") { roleId = ROLE_MANAGEMENT; label = "Management Team"; }
        if (value === "dev") { roleId = ROLE_DEV; label = "Development Team"; }

        const topic = channel.topic || "";
        const newTopic = topic.includes("TEAM:") ? topic.replace(/TEAM:\S+/, `TEAM:${value}`) : `${topic} | TEAM:${value}`;
        await channel.setTopic(newTopic).catch(() => null);

        await channel.send({
          content: roleId ? `<@&${roleId}>` : null,
          components: [card("Ticket Transferred", `Transferred to **${label}** by ${interaction.user}.`, 0x5865f2)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { roles: roleId ? [roleId] : [] },
        }).catch(() => null);

        await adminLog(guild, {
          components: [card("Ticket Transferred (Admin Log)", `**Channel:** ${channel.toString()} (${channel.id})\n**To:** ${label}\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, 0x2b2d31)],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.update({ components: [], content: `✅ Transferred to ${label}.` });
      }

      if (interaction.isButton() && interaction.customId === "ticket_close") {
        const channel = interaction.channel;
        if (!channel) return;

        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true });

        const c = card("Close Ticket", "Are you sure you want to close this ticket?", 0xed4245);
        c.addActionRowComponents((row) =>
          row.setComponents(
            new ButtonBuilder().setCustomId("ticket_close_confirm").setLabel("Confirm Close").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
          )
        );

        return interaction.reply({ ephemeral: true, components: [c], flags: MessageFlags.IsComponentsV2 });
      }

      if (interaction.isButton() && interaction.customId === "ticket_close_cancel") {
        return interaction.update({ components: [], content: "❌ Cancelled." });
      }

      if (interaction.isButton() && interaction.customId === "ticket_close_confirm") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        if (!isStaff(interaction.member)) return interaction.update({ components: [], content: "⚠️ Not allowed." });

        const meta = parseTopic(channel.topic || "");
        if (!meta.ownerId) return interaction.update({ components: [], content: "⚠️ Owner not found." });

        const store = ensureStore(client, guild.id);
        if (!store[channel.id]) store[channel.id] = {};
        store[channel.id].closedBy = interaction.user.tag;

        const rating = new ContainerBuilder().setAccentColor(0x5865f2);
        rating.addTextDisplayComponents((t) => t.setContent("**Rate Your Support Experience**"));
        rating.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        rating.addTextDisplayComponents((t) =>
          t.setContent("How would you rate your customer support experience with Magic UI?\nChoose **1** (poor) to **5** (excellent).")
        );
        rating.addActionRowComponents((row) =>
          row.setComponents(
            new ButtonBuilder().setCustomId("ticket_rate_1").setLabel("1").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_2").setLabel("2").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_3").setLabel("3").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_4").setLabel("4").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket_rate_5").setLabel("5").setStyle(ButtonStyle.Success)
          )
        );

        await channel.send({
          content: `<@${meta.ownerId}>`,
          components: [rating],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [meta.ownerId] },
        }).catch(() => null);

        await adminLog(guild, {
          components: [card("Ticket Close Initiated (Admin Log)", `**Channel:** ${channel.toString()} (${channel.id})\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, 0x2b2d31)],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.update({ components: [], content: "✅ Sent rating request. Ticket will close after feedback." });
      }

      if (interaction.isButton() && /^ticket_rate_[1-5]$/.test(interaction.customId)) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        const meta = parseTopic(channel.topic || "");
        if (!meta.ownerId) return interaction.reply({ content: "⚠️ Owner not found.", ephemeral: true });
        if (interaction.user.id !== meta.ownerId) return interaction.reply({ content: "Only the ticket owner can rate.", ephemeral: true });

        const rating = parseInt(interaction.customId.split("_")[2], 10);
        const store = ensureStore(client, guild.id);
        if (!store[channel.id]) store[channel.id] = {};
        store[channel.id].rating = rating;

        if (rating <= 4) {
          const modal = new ModalBuilder().setCustomId("ticket_feedback_modal").setTitle("Help Us Improve");
          const input = new TextInputBuilder()
            .setCustomId("feedback_details")
            .setLabel("What could we improve?")
            .setPlaceholder("Tell us what went wrong or what we could do better.")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(800);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }

        const c = card("Transcript Option", "Would you like to receive a transcript once the ticket is closed?", 0x5865f2);
        c.addActionRowComponents((row) =>
          row.setComponents(
            new ButtonBuilder().setCustomId("ticket_transcript_yes").setLabel("Yes, send transcript").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("ticket_transcript_no").setLabel("No, just close").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setLabel("☕ Support on Ko-fi").setStyle(ButtonStyle.Link).setURL(KOFI_URL)
          )
        );

        return interaction.reply({ ephemeral: true, components: [c], flags: MessageFlags.IsComponentsV2 });
      }

      if (interaction.isModalSubmit() && interaction.customId === "ticket_feedback_modal") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        const meta = parseTopic(channel.topic || "");
        if (!meta.ownerId || interaction.user.id !== meta.ownerId) return interaction.reply({ content: "Only the owner can submit feedback.", ephemeral: true });

        const feedback = interaction.fields.getTextInputValue("feedback_details");
        const store = ensureStore(client, guild.id);
        if (!store[channel.id]) store[channel.id] = {};
        store[channel.id].feedback = feedback;

        const c = card("Transcript Option", "Would you like to receive a transcript once the ticket is closed?", 0x5865f2);
        c.addActionRowComponents((row) =>
          row.setComponents(
            new ButtonBuilder().setCustomId("ticket_transcript_yes").setLabel("Yes, send transcript").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("ticket_transcript_no").setLabel("No, just close").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setLabel("☕ Support on Ko-fi").setStyle(ButtonStyle.Link).setURL(KOFI_URL)
          )
        );

        return interaction.reply({ ephemeral: true, components: [c], flags: MessageFlags.IsComponentsV2 });
      }

      if (interaction.isButton() && (interaction.customId === "ticket_transcript_yes" || interaction.customId === "ticket_transcript_no")) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        const meta = parseTopic(channel.topic || "");
        if (!meta.ownerId || interaction.user.id !== meta.ownerId) return interaction.reply({ content: "Only the owner can choose this.", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const store = ensureStore(client, guild.id);
        if (!store[channel.id]) store[channel.id] = {};
        store[channel.id].wantsTranscript = interaction.customId === "ticket_transcript_yes";

        return finalizeClose(interaction, channel, client);
      }
    } catch (err) {
      console.error("ticket interaction error:", err);
      try {
        if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: "⚠️ Something went wrong.", ephemeral: true });
        else await interaction.followUp({ content: "⚠️ Something went wrong.", ephemeral: true });
      } catch { }
    }
  },
};
