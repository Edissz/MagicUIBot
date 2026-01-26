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
  {
    label: "Payment / Billing",
    value: "billing",
    desc: "Charges, invoices, upgrades, access",
    emoji: { id: "1465426488269607168", name: "invoice02StrokeRounded" },
  },
  {
    label: "Bug / Technical Support",
    value: "bug",
    desc: "Not working, errors, broken UI",
    emoji: { id: "1465426469886103646", name: "documentcodeStrokeRounded" },
  },
  {
    label: "General Support",
    value: "general",
    desc: "How-to, setup, guidance",
    emoji: { id: "1465426383072399360", name: "chatquestionStrokeRounded" },
  },
  {
    label: "Report Rule Violation",
    value: "report",
    desc: "Report rule-breaking",
    emoji: { id: "1465426405918638090", name: "flag01StrokeRounded" },
  },
  {
    label: "Product / Security Issue",
    value: "order",
    desc: "Orders, product, entitlement",
    emoji: { id: "1465426351896006726", name: "websecurityStrokeRounded" },
  },
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

function wizardPayload(selected) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_wizard_reason")
    .setPlaceholder("Select a reason")
    .addOptions(
      REASONS.map((r) => ({
        label: r.label,
        value: r.value,
        description: r.desc,
        emoji: r.emoji,
      }))
    );

  const btn = new ButtonBuilder()
    .setCustomId("ticket_wizard_continue")
    .setLabel("Continue")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!selected);

  return {
    components: [
      v2Card("Contact Support", "Pick a reason below, then press **Continue**. You’ll fill a short form after this."),
      new ActionRowBuilder().addComponents(menu),
      new ActionRowBuilder().addComponents(btn),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
}

async function finalizeClose(channel, client, opts) {
  const guild = channel.guild;
  const ownerId = getOwnerId(channel);
  const claimedBy = getClaimedBy(channel);

  const transcript = await saveTranscript(channel).catch(() => "");
  const file = transcript ? transcriptAttachment(channel.id, transcript) : null;

  const embed = new EmbedBuilder()
    .setTitle("Ticket Closed")
    .setColor(BRAND_BLUE)
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
    if (user) await user.send({ content: "Here is your MagicUI ticket transcript:", files: [file] }).catch(() => null);
  }

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
        const store = ensureWizardStore(client);
        store.set(interaction.user.id, { reason: null });
        return interaction.reply(wizardPayload(null));
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_wizard_reason") {
        const store = ensureWizardStore(client);
        const state = store.get(interaction.user.id) || { reason: null };
        state.reason = interaction.values[0];
        store.set(interaction.user.id, state);
        return interaction.update(wizardPayload(state.reason));
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

        store.delete(interaction.user.id);

        return interaction.editReply({
          components: [v2Card("Ticket Created", `Created ${channel.toString()} successfully.`)],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
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
