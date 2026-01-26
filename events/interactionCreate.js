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

const CATEGORY_ID = "1405640921017745419";
const LOG_ID = "1441524770083573770";

const ROLE_SUPPORT = "1405207645618700349";
const ROLE_MANAGEMENT = "1441080027113586841";
const ROLE_DEV = "1441079871911493693";

const REASONS = [
  { label: "Payment Issue", value: "billing", desc: "Charges, invoices, upgrades, access", emoji: { id: "1465426488269607168", name: "invoice02StrokeRounded" } },
  { label: "Tech Support", value: "bug", desc: "Broken components, errors, setup problems", emoji: { id: "1465426469886103646", name: "documentcodeStrokeRounded" } },
  { label: "General Support", value: "general", desc: "Questions, guidance, help", emoji: { id: "1465426383072399360", name: "chatquestionStrokeRounded" } },
  { label: "Report Rule", value: "report", desc: "Report abuse or rule violations", emoji: { id: "1465426405918638090", name: "flag01StrokeRounded" } },
  { label: "Product Issue", value: "order", desc: "Entitlement, product/access issues", emoji: { id: "1465426351896006726", name: "websecurityStrokeRounded" } },
];

function isStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  return member.roles.cache.has(ROLE_SUPPORT) || member.roles.cache.has(ROLE_MANAGEMENT) || member.roles.cache.has(ROLE_DEV);
}

function safeName(s) {
  return String(s || "ticket")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18) || "ticket";
}

function baseName(name) {
  return String(name || "").replace(/^📥｜|^⏸️｜|^✅｜/g, "").replace(/^claimed-/, "").replace(/^hold-/, "").replace(/^closed-/, "");
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
  const t = String(topic || "");
  if (/CLAIMED_BY:\d{17,20}/.test(t)) return t.replace(/CLAIMED_BY:\d{17,20}/, `CLAIMED_BY:${userId}`);
  return t.trim().length ? `${t} | CLAIMED_BY:${userId}` : `CLAIMED_BY:${userId}`;
}

function setTeamTopic(topic, team) {
  const t = String(topic || "");
  if (/TEAM:\S+/.test(t)) return t.replace(/TEAM:\S+/, `TEAM:${team}`);
  return t.trim().length ? `${t} | TEAM:${team}` : `TEAM:${team}`;
}

function v2Card(title, body) {
  const c = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  const safe = String(body || "\u200B");
  c.addTextDisplayComponents((t) => t.setContent(safe.length ? safe : "\u200B"));
  return c;
}

function ticketControlsContainer() {
  const c = new ContainerBuilder().setAccentColor(BRAND_BLUE);
  c.addTextDisplayComponents((t) => t.setContent("\u200B"));
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

function ensureWizardStore(client) {
  if (!client.__ticketWizard) client.__ticketWizard = new Map();
  return client.__ticketWizard;
}

async function logEmbed(guild, embed, file) {
  const ch = guild.channels.cache.get(LOG_ID) || (await guild.channels.fetch(LOG_ID).catch(() => null));
  if (!ch || !ch.isTextBased()) return;
  const payload = file ? { embeds: [embed], files: [file] } : { embeds: [embed] };
  await ch.send(payload).catch(() => null);
}

async function closeTicket(channel, client, closedByUser) {
  const guild = channel.guild;
  const ownerId = getOwnerId(channel);
  const claimedBy = getClaimedBy(channel);

  const transcript = await saveTranscript(channel).catch(() => "");
  const file = transcript ? transcriptAttachment(channel.id, transcript) : null;

  const log = new EmbedBuilder()
    .setTitle("Ticket Closed")
    .setColor(BRAND_BLUE)
    .setDescription(
      `**Channel:** ${channel.toString()} (${channel.id})\n` +
      `**Owner:** ${ownerId ? `<@${ownerId}> (${ownerId})` : "N/A"}\n` +
      `**Claimed By:** ${claimedBy ? `<@${claimedBy}> (${claimedBy})` : "Unclaimed"}\n` +
      `**Closed By:** ${closedByUser.tag} (${closedByUser.id})\n` +
      `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
    )
    .setTimestamp();

  await logEmbed(guild, log, file);

  const base = baseName(channel.name);
  await channel.setName(`✅｜closed-${base}`.slice(0, 95)).catch(() => null);

  await channel.send({
    components: [v2Card("Ticket Closing", "Transcript saved. This channel will be deleted in a few seconds.")],
    flags: MessageFlags.IsComponentsV2,
  }).catch(() => null);

  setTimeout(async () => {
    await channel.delete("Ticket closed").catch(() => null);
  }, 6000);
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isButton() && interaction.customId === "ticket_start") {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("ticket_reason_select")
          .setPlaceholder("Select a reason")
          .addOptions(REASONS.map((r) => ({ label: r.label, value: r.value, description: r.desc, emoji: r.emoji })));

        const container = new ContainerBuilder().setAccentColor(BRAND_BLUE);
        container.addTextDisplayComponents((t) => t.setContent("**Contact Support**"));
        container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents((t) => t.setContent("Choose a reason below. Next, you’ll fill out the support form."));
        container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents((row) => row.setComponents(menu));

        return interaction.reply({
          components: [container],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_reason_select") {
        const reason = interaction.values[0];
        const store = ensureWizardStore(client);
        store.set(interaction.user.id, reason);

        const modal = new ModalBuilder().setCustomId(`ticket_modal_${reason}`).setTitle("Submit Ticket");

        const issue = new TextInputBuilder().setCustomId("t_issue").setLabel("Describe your issue").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000);
        const tried = new TextInputBuilder().setCustomId("t_tried").setLabel("Steps you tried").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(800);
        const license = new TextInputBuilder().setCustomId("t_license").setLabel("License type (Free or Pro)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30);
        const email = new TextInputBuilder().setCustomId("t_email").setLabel("Email (optional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(80);

        modal.addComponents(
          new ActionRowBuilder().addComponents(issue),
          new ActionRowBuilder().addComponents(tried),
          new ActionRowBuilder().addComponents(license),
          new ActionRowBuilder().addComponents(email)
        );

        return interaction.showModal(modal);
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
        const guild = interaction.guild;
        if (!guild) return;

        const reason = interaction.customId.replace("ticket_modal_", "");
        const reasonLabel = REASONS.find((r) => r.value === reason)?.label || reason;

        await interaction.reply({
          components: [v2Card("Creating Ticket", "Please wait…")],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        const issue = interaction.fields.getTextInputValue("t_issue");
        const tried = interaction.fields.getTextInputValue("t_tried");
        const license = interaction.fields.getTextInputValue("t_license");
        const email = (interaction.fields.getTextInputValue("t_email") || "").trim();

        const parent = guild.channels.cache.get(CATEGORY_ID) || (await guild.channels.fetch(CATEGORY_ID).catch(() => null));
        if (!parent) {
          return interaction.editReply({
            components: [v2Card("Error", "Ticket category not found. Contact an admin.")],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        const base = safeName(interaction.user.username);
        const chName = `ticket-${base}-${reason}`.slice(0, 95);

        const overwrites = [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels,
            ],
          },
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

        try { await interaction.user.send(`✅ Your ticket has been created: ${channel.toString()}`); } catch { }

        const log = new EmbedBuilder()
          .setTitle("Ticket Created")
          .setColor(BRAND_BLUE)
          .setDescription(
            `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
            `**Channel:** ${channel.toString()} (${channel.id})\n` +
            `**Reason:** ${reasonLabel}\n` +
            `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setTimestamp();

        await logEmbed(guild, log);

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

        if (!isStaff(interaction.member)) {
          return interaction.reply({ components: [v2Card("No Access", "Staff only.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        if (interaction.customId === "ticket_claim") {
          const already = getClaimedBy(channel);
          if (already) return interaction.reply({ components: [v2Card("Already Claimed", `Already claimed by <@${already}>.`)], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

          await channel.setTopic(setClaimedByTopic(channel.topic || `OWNER:${ownerId}`, interaction.user.id)).catch(() => null);
          await channel.setName(`📥｜claimed-${baseName(channel.name)}`.slice(0, 95)).catch(() => null);

          await channel.send({ components: [v2Card("Ticket Claimed", `Claimed by ${interaction.user.tag}.`)], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
          await registerTicketClaim(client, channel);

          const log = new EmbedBuilder().setTitle("Ticket Claimed").setColor(BRAND_BLUE).setDescription(`**Channel:** ${channel.toString()} (${channel.id})\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`).setTimestamp();
          await logEmbed(guild, log);

          return interaction.reply({ components: [v2Card("Claimed", "Ticket claimed successfully.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        if (interaction.customId === "ticket_hold") {
          await channel.setName(`⏸️｜hold-${baseName(channel.name)}`.slice(0, 95)).catch(() => null);
          await channel.send({ components: [v2Card("Ticket On Hold", `Put on hold by ${interaction.user.tag}.`)], flags: MessageFlags.IsComponentsV2 }).catch(() => null);

          const log = new EmbedBuilder().setTitle("Ticket On Hold").setColor(BRAND_BLUE).setDescription(`**Channel:** ${channel.toString()} (${channel.id})\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`).setTimestamp();
          await logEmbed(guild, log);

          return interaction.reply({ components: [v2Card("On Hold", "Ticket marked on hold.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
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

        if (interaction.customId === "ticket_close") {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ticket_close_confirm").setLabel("Confirm Close").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
          );

          return interaction.reply({
            components: [v2Card("Close Ticket", "Are you sure you want to close this ticket?"), row],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_transfer_select") {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel) return;

        if (!isStaff(interaction.member)) return interaction.reply({ components: [v2Card("No Access", "Staff only.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

        const value = interaction.values[0];
        const roleId = value === "support" ? ROLE_SUPPORT : value === "management" ? ROLE_MANAGEMENT : ROLE_DEV;
        const label = value === "support" ? "Customer Support Team" : value === "management" ? "Management Team" : "Development Team";

        await channel.setTopic(setTeamTopic(channel.topic || "", value)).catch(() => null);

        await channel.send({
          components: [v2Card("Ticket Transferred", `Transferred to **${label}** by ${interaction.user.tag}.\n<@&${roleId}>`)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { roles: [roleId] },
        }).catch(() => null);

        const ping = await channel.send({
          content: `<@&${roleId}>`,
          allowedMentions: { roles: [roleId] },
        }).catch(() => null);

        if (ping) setTimeout(() => ping.delete().catch(() => null), 4000);

        const log = new EmbedBuilder().setTitle("Ticket Transferred").setColor(BRAND_BLUE).setDescription(`**Channel:** ${channel.toString()} (${channel.id})\n**To:** ${label}\n**By:** ${interaction.user.tag} (${interaction.user.id})\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`).setTimestamp();
        await logEmbed(guild, log);

        return interaction.update({ components: [v2Card("Transferred", `Transferred to ${label}.`)], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
      }

      if (interaction.isButton() && (interaction.customId === "ticket_close_confirm" || interaction.customId === "ticket_close_cancel")) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!guild || !channel) return;

        if (interaction.customId === "ticket_close_cancel") {
          return interaction.update({ components: [v2Card("Cancelled", "Ticket closure cancelled.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        if (!isStaff(interaction.member)) {
          return interaction.update({ components: [v2Card("No Access", "Staff only.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        await interaction.update({ components: [v2Card("Closing", "Closing ticket now…")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        await closeTicket(channel, client, interaction.user);
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
