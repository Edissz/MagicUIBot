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

const SUPPORT_PANEL_CHANNEL_ID = "1405208521871724605";
const CATEGORY_ID = "1405640921017745419";
const ADMIN_LOG_ID = "1441524770083573770";

const ROLE_SUPPORT = "1405207645618700349";
const ROLE_MANAGEMENT = "1441080027113586841";
const ROLE_DEV = "1441079871911493693";

const STAFF_ROLE_NAMES_FOR_BUTTONS = ["Moderator", "Administrator", "Manager"];

const KOFI_URL = "https://ko-fi.com/summary/984bdf5c-a724-4489-b324-9f44d2d85f1e";

const REASONS = [
  { value: "payment", label: "Payment Issue", description: "Problems with billing, refunds, or failed transactions." },
  { value: "bug", label: "Bug Report & Technical Support", description: "Something isn’t working? Report technical issues or glitches." },
  { value: "general", label: "General Support", description: "Need help or have a question not listed above?" },
  { value: "rule", label: "Rule Violation", description: "Report a user or component breaking server rules or terms." },
  { value: "order", label: "Order / Product Issue", description: "Issue with a purchase, delivery, or product received." },
];

function sanitizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 18) || "user";
}

function baseTicketName(name) {
  return String(name || "")
    .replace(/^closed-/, "")
    .replace(/^hold-/, "")
    .replace(/^claimed-/, "")
    .replace(/^ticket-/, "ticket-");
}

function isStaffMember(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return member.roles.cache.some(
    (r) =>
      r.id === ROLE_SUPPORT ||
      r.id === ROLE_MANAGEMENT ||
      r.id === ROLE_DEV ||
      STAFF_ROLE_NAMES_FOR_BUTTONS.includes(r.name)
  );
}

function getMetaStore(client, guildId) {
  if (!client.__ticketMeta) client.__ticketMeta = {};
  if (!client.__ticketMeta[guildId]) client.__ticketMeta[guildId] = {};
  return client.__ticketMeta[guildId];
}

function parseTopic(topic) {
  const t = String(topic || "");
  const get = (key) => {
    const m = t.match(new RegExp(`${key}:(\\S+)`));
    return m ? m[1] : null;
  };
  return {
    ownerId: get("OWNER"),
    type: get("TYPE"),
    claimedBy: get("CLAIMED_BY"),
    team: get("TEAM"),
    created: get("CREATED"),
  };
}

async function fetchTextChannel(guild, id) {
  const ch = guild.channels.cache.get(id);
  if (ch) return ch;
  try { return await guild.channels.fetch(id); } catch { return null; }
}

function v2Card({ title, body, accent }) {
  const c = new ContainerBuilder();
  if (accent) c.setAccentColor(accent);

  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  const safe = String(body || "").trim();
  c.addTextDisplayComponents((t) => t.setContent(safe.length ? safe : " "));
  return c;
}

function ticketOpenCard({ userId, type, issue, tried, plan, notes }) {
  const body =
    `**Submitted by:** <@${userId}> \`(${userId})\`\n` +
    `**Ticket Type:** \`${type}\`\n\n` +
    `**Issue Details:**\n${issue}\n\n` +
    `**Steps Tried:**\n${tried}\n\n` +
    `**License Type:**\n${plan && plan.trim().length ? plan : "N/A"}\n\n` +
    `**Additional Notes:**\n${notes && notes.trim().length ? notes : "N/A"}\n\n` +
    `A staff member will review your issue shortly. Please avoid tagging staff members unless necessary.`;

  const c = v2Card({ title: "Magic UI Support Ticket", body, accent: 0xed4245 });

  c.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim Ticket").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("ticket_hold").setLabel("Put On Hold").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_transfer").setLabel("Transfer Ticket").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
    )
  );

  return c;
}

function ratingCard() {
  const c = v2Card({
    title: "Rate Your Support Experience",
    body:
      "How would you rate your customer support experience with Magic UI?\n\n" +
      "Choose a rating from **1** (poor) to **5** (excellent).",
    accent: 0x5865f2,
  });

  c.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder().setCustomId("ticket_rate_1").setLabel("1").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_rate_2").setLabel("2").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_rate_3").setLabel("3").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_rate_4").setLabel("4").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_rate_5").setLabel("5").setStyle(ButtonStyle.Success)
    )
  );

  return c;
}

function transcriptChoiceCard() {
  const c = v2Card({
    title: "Transcript Option",
    body: "Would you like to receive a transcript of this conversation once the ticket is closed?",
    accent: 0x5865f2,
  });

  c.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder().setCustomId("ticket_transcript_yes").setLabel("Yes, send transcript").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ticket_transcript_no").setLabel("No, just close").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setLabel("Buy your advisor a Ko-fi ☕").setStyle(ButtonStyle.Link).setURL(KOFI_URL)
    )
  );

  return c;
}

async function adminLog(guild, payload) {
  const ch = await fetchTextChannel(guild, ADMIN_LOG_ID);
  if (!ch || !ch.isTextBased()) return;
  await ch.send(payload).catch(() => null);
}

async function finalizeTicketClose(interaction, channel, client) {
  const guild = interaction.guild;
  if (!guild || !channel) return;

  const topic = parseTopic(channel.topic || "");
  const store = getMetaStore(client, guild.id);
  const meta = store[channel.id] || null;

  const feedback = meta?.feedback || null;
  const rating = meta?.rating || null;
  const wantsTranscript = meta?.wantsTranscript || false;

  const closedBy = meta?.closedByTag || interaction.user.tag;
  const ownerId = topic.ownerId;

  const base = baseTicketName(channel.name);
  await channel.setName(`closed-${base}`).catch(() => null);

  const closeBody =
    `This ticket has been **closed by ${closedBy}**.\n` +
    `A transcript will be saved and the channel will be deleted shortly.\n\n` +
    (rating ? `**User Rating:** ${rating}/5\n` : "") +
    (feedback && feedback.trim().length ? `**User Feedback:** ${feedback}\n` : "");

  await channel.send({
    components: [v2Card({ title: "Ticket Closed", body: closeBody, accent: 0xed4245 })],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  }).catch(() => null);

  const content = await saveTranscript(channel);
  const file = new AttachmentBuilder(Buffer.from(content, "utf-8"), { name: `transcript-${channel.id}.txt` });

  const logLines = [];
  logLines.push(`**Channel:** #${channel.name} (${channel.id})`);
  if (ownerId) logLines.push(`**Owner:** <@${ownerId}> (${ownerId})`);
  if (topic.type) logLines.push(`**Type:** ${topic.type}`);
  if (topic.claimedBy) logLines.push(`**Claimed By:** <@${topic.claimedBy}> (${topic.claimedBy})`);
  if (topic.team) logLines.push(`**Team:** ${topic.team}`);
  logLines.push(`**Closed By:** ${closedBy}`);
  logLines.push(`**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`);

  if (meta?.issue) logLines.push(`\n**Issue:**\n${String(meta.issue).slice(0, 1200)}`);
  if (meta?.tried) logLines.push(`\n**Steps Tried:**\n${String(meta.tried).slice(0, 1200)}`);
  if (meta?.plan) logLines.push(`\n**License:** ${String(meta.plan).slice(0, 200)}`);
  if (meta?.notes) logLines.push(`\n**Notes:** ${String(meta.notes).slice(0, 600)}`);

  if (rating) logLines.push(`\n**Rating:** ${rating}/5`);
  if (feedback && feedback.trim().length) logLines.push(`**Feedback:** ${feedback.slice(0, 900)}`);

  await adminLog(guild, {
    components: [v2Card({ title: "Ticket Closed (Full Log)", body: logLines.join("\n"), accent: 0x2b2d31 })],
    files: [file],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });

  if (ownerId && wantsTranscript) {
    const owner = await client.users.fetch(ownerId).catch(() => null);
    if (owner) {
      await owner.send({
        components: [v2Card({ title: "Your Ticket Transcript", body: "Here is the transcript for your closed MagicUI support ticket.", accent: 0x2b2d31 })],
        files: [file],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      }).catch(() => null);
    }
  }

  delete store[channel.id];

  setTimeout(async () => {
    try { await channel.delete("Ticket closed"); } catch { }
  }, 7000);

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        components: [v2Card({ title: "Closed", body: "Thanks! This ticket is now closing.", accent: 0x2b2d31 })],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  } catch { }
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (!client.__seenInteractions) client.__seenInteractions = new Set();
      if (client.__seenInteractions.has(interaction.id)) return;
      client.__seenInteractions.add(interaction.id);
      setTimeout(() => client.__seenInteractions.delete(interaction.id), 60000);

      if (interaction.isButton() && interaction.customId === "ticket_contact") {
        const c = v2Card({
          title: "Contact Support",
          body: "Select the reason for your ticket below. After selection, you’ll be asked to fill out the form.",
          accent: 0x5865f2,
        });

        c.addActionRowComponents((row) =>
          row.setComponents(
            new StringSelectMenuBuilder()
              .setCustomId("ticket_reason_select")
              .setPlaceholder("Select a reason")
              .addOptions(REASONS.map((r) => ({ label: r.label, value: r.value, description: r.description })))
          )
        );

        return interaction.reply({
          components: [c],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_reason_select") {
        const reason = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${reason}`)
          .setTitle("Support Ticket Form");

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

        const category = await guild.channels.fetch(CATEGORY_ID).catch(() => null);
        if (!category) return interaction.editReply({ content: "⚠️ Ticket category not found." });

        const uname = sanitizeName(interaction.user.username);
        const base = `ticket-${uname}-${type}`;

        const overwrites = [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: ROLE_SUPPORT, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
          { id: ROLE_MANAGEMENT, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
          { id: ROLE_DEV, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
        ];

        const ch = await guild.channels.create({
          name: base,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: overwrites,
          reason: `Ticket created by ${interaction.user.tag} (${interaction.user.id})`,
        });

        const createdUnix = Math.floor(Date.now() / 1000);
        await ch.setTopic(`OWNER:${interaction.user.id} | TYPE:${type} | CREATED:${createdUnix}`).catch(() => null);

        registerTicketOpen(client, ch);

        const store = getMetaStore(client, guild.id);
        store[ch.id] = {
          userId: interaction.user.id,
          type,
          issue,
          tried,
          plan,
          notes,
          createdAt: Date.now(),
          rating: null,
          feedback: null,
          wantsTranscript: false,
          closedByTag: null,
        };

        const pingLine = `<@${interaction.user.id}> <@&${ROLE_SUPPORT}> <@&${ROLE_MANAGEMENT}> <@&${ROLE_DEV}>`;

        await ch.send({
          components: [
            v2Card({
              title: "Ticket Created",
              body: pingLine,
              accent: 0x2b2d31,
            }),
            ticketOpenCard({
              userId: interaction.user.id,
              type,
              issue,
              tried,
              plan,
              notes,
            }),
          ],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [interaction.user.id], roles: [ROLE_SUPPORT, ROLE_MANAGEMENT, ROLE_DEV] },
        });

        await adminLog(guild, {
          components: [
            v2Card({
              title: "Ticket Created",
              body:
                `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
                `**Channel:** ${ch.toString()} (${ch.id})\n` +
                `**Type:** ${type}\n` +
                `**Time:** <t:${createdUnix}:F>\n\n` +
                `**Issue:**\n${issue.slice(0, 1200)}\n\n` +
                `**Steps Tried:**\n${tried.slice(0, 1200)}\n\n` +
                `**License:** ${plan && plan.trim().length ? plan : "N/A"}\n` +
                `**Notes:** ${notes && notes.trim().length ? notes : "N/A"}`,
              accent: 0x2b2d31,
            }),
          ],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });

        try {
          await interaction.user.send({
            components: [
              v2Card({
                title: "Ticket Created",
                body: `Your support ticket has been created: ${ch.toString()}\nA staff member will assist you soon.`,
                accent: 0x2b2d31,
              }),
            ],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
          });
        } catch { }

        return interaction.editReply({
          components: [
            v2Card({
              title: "Submitted",
              body: `✅ Your support ticket has been opened: ${ch.toString()}`,
              accent: 0x2b2d31,
            }),
          ],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      if (interaction.isButton() && /^ticket_(claim|hold|transfer|close)$/.test(interaction.customId)) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild || channel.type !== ChannelType.GuildText) {
          return interaction.reply({ content: "⚠️ Invalid ticket channel.", ephemeral: true });
        }

        if (!isStaffMember(interaction.member)) {
          return interaction.reply({
            components: [v2Card({ title: "Not Allowed", body: "You are not allowed to do that.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const topic = parseTopic(channel.topic || "");
        const store = getMetaStore(client, guild.id);
        const meta = store[channel.id];

        if (interaction.customId === "ticket_claim") {
          if (topic.claimedBy) {
            return interaction.reply({
              components: [v2Card({ title: "Already Claimed", body: `This ticket is already claimed by <@${topic.claimedBy}>.`, accent: 0x2b2d31 })],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
              allowedMentions: { parse: [] },
            });
          }

          const base = baseTicketName(channel.name);
          await channel.setName(`claimed-${base}`).catch(() => null);

          const existing = channel.topic || "";
          const newTopic = existing.includes("CLAIMED_BY:")
            ? existing.replace(/CLAIMED_BY:\S+/, `CLAIMED_BY:${interaction.user.id}`)
            : `${existing} | CLAIMED_BY:${interaction.user.id}`;
          await channel.setTopic(newTopic).catch(() => null);

          await channel.send({
            components: [v2Card({ title: "Ticket Claimed", body: `This ticket has been claimed by ${interaction.user}.`, accent: 0x2ecc71 })],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => null);

          await registerTicketClaim(client, channel);

          await adminLog(guild, {
            components: [v2Card({ title: "Ticket Claimed", body: `**Channel:** ${channel.toString()} (${channel.id})\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, accent: 0x2b2d31 })],
            flags: MessageFlags.IsComponentsV2,
          });

          return interaction.reply({
            components: [v2Card({ title: "Done", body: "✅ Ticket claimed.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (interaction.customId === "ticket_hold") {
          const base = baseTicketName(channel.name);
          await channel.setName(`hold-${base}`).catch(() => null);

          await channel.send({
            components: [v2Card({ title: "Ticket On Hold", body: `This ticket has been put on hold by ${interaction.user}.`, accent: 0xf1c40f })],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => null);

          await adminLog(guild, {
            components: [v2Card({ title: "Ticket On Hold", body: `**Channel:** ${channel.toString()} (${channel.id})\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, accent: 0x2b2d31 })],
            flags: MessageFlags.IsComponentsV2,
          });

          return interaction.reply({
            components: [v2Card({ title: "Done", body: "⏸️ Ticket marked as on hold.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (interaction.customId === "ticket_transfer") {
          const c = v2Card({
            title: "Transfer Ticket",
            body: "Select which team should take over this ticket.",
            accent: 0x5865f2,
          });

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

          return interaction.reply({
            components: [c],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (interaction.customId === "ticket_close") {
          const c = v2Card({
            title: "Close Ticket",
            body: "Are you sure you want to close this ticket?",
            accent: 0xed4245,
          });

          c.addActionRowComponents((row) =>
            row.setComponents(
              new ButtonBuilder().setCustomId("ticket_close_confirm").setLabel("Confirm Close").setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
            )
          );

          return interaction.reply({
            components: [c],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_transfer_select") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        if (!isStaffMember(interaction.member)) {
          return interaction.reply({
            components: [v2Card({ title: "Not Allowed", body: "You are not allowed to transfer tickets.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const value = interaction.values[0];
        let roleId = null;
        let label = "";

        if (value === "support") { roleId = ROLE_SUPPORT; label = "Customer Support Team"; }
        if (value === "management") { roleId = ROLE_MANAGEMENT; label = "Management Team"; }
        if (value === "dev") { roleId = ROLE_DEV; label = "Development Team"; }

        const existing = channel.topic || "";
        const newTopic = existing.includes("TEAM:")
          ? existing.replace(/TEAM:\S+/, `TEAM:${value}`)
          : `${existing} | TEAM:${value}`;
        await channel.setTopic(newTopic).catch(() => null);

        const mention = roleId ? `<@&${roleId}>` : "";
        await channel.send({
          components: [v2Card({ title: "Ticket Transferred", body: `Transferred to **${label}** by ${interaction.user}.\n${mention}`.trim(), accent: 0x5865f2 })],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { roles: roleId ? [roleId] : [] },
        }).catch(() => null);

        await adminLog(guild, {
          components: [v2Card({ title: "Ticket Transferred", body: `**Channel:** ${channel.toString()} (${channel.id})\n**To:** ${label}\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, accent: 0x2b2d31 })],
          flags: MessageFlags.IsComponentsV2,
        });

        return interaction.update({
          components: [v2Card({ title: "Done", body: `✅ Ticket transferred to ${label}.`, accent: 0x2b2d31 })],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isButton() && /^ticket_close_(confirm|cancel)$/.test(interaction.customId)) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        if (interaction.customId === "ticket_close_cancel") {
          return interaction.update({
            components: [v2Card({ title: "Cancelled", body: "Ticket closure cancelled.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (!isStaffMember(interaction.member)) {
          return interaction.update({
            components: [v2Card({ title: "Not Allowed", body: "You are not allowed to close tickets.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const topic = parseTopic(channel.topic || "");
        if (!topic.ownerId) {
          return interaction.update({
            components: [v2Card({ title: "Error", body: "Ticket owner not found. Close manually.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const store = getMetaStore(client, guild.id);
        if (!store[channel.id]) store[channel.id] = {};
        store[channel.id].closedByTag = interaction.user.tag;

        await channel.send({
          components: [ratingCard()],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [topic.ownerId] },
        }).catch(() => null);

        return interaction.update({
          components: [v2Card({ title: "Sent", body: "A rating request was sent to the ticket owner. Ticket will close after feedback.", accent: 0x2b2d31 })],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isButton() && /^ticket_rate_[1-5]$/.test(interaction.customId)) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        const topic = parseTopic(channel.topic || "");
        if (!topic.ownerId) {
          return interaction.reply({ content: "⚠️ Ticket owner not found.", ephemeral: true });
        }
        if (interaction.user.id !== topic.ownerId) {
          return interaction.reply({
            components: [v2Card({ title: "Not Allowed", body: "Only the ticket owner can rate this ticket.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const rating = parseInt(interaction.customId.split("_")[2], 10);
        const store = getMetaStore(client, guild.id);
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

        return interaction.reply({
          components: [transcriptChoiceCard()],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isModalSubmit() && interaction.customId === "ticket_feedback_modal") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        const topic = parseTopic(channel.topic || "");
        if (!topic.ownerId || interaction.user.id !== topic.ownerId) {
          return interaction.reply({ content: "Only the ticket owner can submit feedback.", ephemeral: true });
        }

        const feedback = interaction.fields.getTextInputValue("feedback_details");
        const store = getMetaStore(client, guild.id);
        if (!store[channel.id]) store[channel.id] = {};
        store[channel.id].feedback = feedback;

        return interaction.reply({
          components: [transcriptChoiceCard()],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.isButton() && (interaction.customId === "ticket_transcript_yes" || interaction.customId === "ticket_transcript_no")) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild) return;

        const topic = parseTopic(channel.topic || "");
        if (!topic.ownerId || interaction.user.id !== topic.ownerId) {
          return interaction.reply({
            components: [v2Card({ title: "Not Allowed", body: "Only the ticket owner can choose this.", accent: 0x2b2d31 })],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        await interaction.deferReply({ ephemeral: true });

        const store = getMetaStore(client, guild.id);
        if (!store[channel.id]) store[channel.id] = {};
        store[channel.id].wantsTranscript = interaction.customId === "ticket_transcript_yes";

        await finalizeTicketClose(interaction, channel, client);
        return;
      }
    } catch (err) {
      console.error("Error in interactionCreate handler:", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "⚠️ Something went wrong.", ephemeral: true });
        } else {
          await interaction.followUp({ content: "⚠️ Something went wrong.", ephemeral: true });
        }
      } catch { }
    }
  },
};
