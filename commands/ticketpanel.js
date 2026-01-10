const {
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

const TICKET_CATEGORY_ID = "1405640921017745419";
const SUPPORT_ROLE_IDS = ["1405207645618700349", "1441080027113586841", "1441079871911493693"];

const BRAND = {
  color: 0xffffff,
  authorName: "MagicUI Support",
  authorIcon:
    "https://cdn.discordapp.com/icons/000000000000000000/000000000000000000.png?size=128",
  footerText: "MagicUI support",
};

function v2Embed({ title, description }) {
  return new EmbedBuilder()
    .setColor(BRAND.color)
    .setAuthor({ name: BRAND.authorName, iconURL: BRAND.authorIcon })
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: BRAND.footerText })
    .setTimestamp();
}

function reasonLabel(v) {
  if (v === "billing") return "Payment Issue";
  if (v === "bug") return "Bug Report & Technical Support";
  if (v === "general") return "General Support";
  if (v === "rule") return "Rule Violation";
  if (v === "order") return "Order / Product Issue";
  if (v === "voice") return "Live Voice Meeting With Support";
  return v;
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== "ticket_reason_select") return;

      const reason = interaction.values[0];
      const guild = interaction.guild;
      if (!guild) return;

      const existing = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          c.parentId === TICKET_CATEGORY_ID &&
          typeof c.topic === "string" &&
          c.topic.includes(`ticket:${interaction.user.id}`)
      );

      if (existing) {
        return interaction.reply({
          content: `⚠️ You already have an open ticket: <#${existing.id}>`,
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`ticket_issue_modal:${reason}`)
        .setTitle(`Ticket — ${reasonLabel(reason)}`);

      const summary = new TextInputBuilder()
        .setCustomId("ticket_summary")
        .setLabel("Short summary")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(80)
        .setRequired(true)
        .setPlaceholder("e.g. Payment failed / Component bug / Access issue...");

      const details = new TextInputBuilder()
        .setCustomId("ticket_details")
        .setLabel("Details (include links, errors, screenshots info)")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(900)
        .setRequired(true)
        .setPlaceholder("Explain what happened, steps to reproduce, order IDs, etc.");

      modal.addComponents(
        new ActionRowBuilder().addComponents(summary),
        new ActionRowBuilder().addComponents(details)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit()) {
      if (!interaction.customId.startsWith("ticket_issue_modal:")) return;

      const reason = interaction.customId.split(":")[1] || "general";
      const summary = interaction.fields.getTextInputValue("ticket_summary");
      const details = interaction.fields.getTextInputValue("ticket_details");

      const guild = interaction.guild;
      if (!guild) return;

      const base = (interaction.user.username || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10);
      const suffix = interaction.user.id.slice(-4);
      const channelName = `ticket-${base || "user"}-${suffix}`;

      const overwrites = [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AddReactions,
          ],
        },
        ...SUPPORT_ROLE_IDS.map((rid) => ({
          id: rid,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageMessages,
          ],
        })),
      ];

      const ch = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        topic: `ticket:${interaction.user.id} reason:${reason}`,
        permissionOverwrites: overwrites,
      });

      const ticketEmbed = v2Embed({
        title: `Ticket Opened — ${reasonLabel(reason)}`,
        description:
          `**User:** <@${interaction.user.id}>\n` +
          `**Summary:** ${summary}\n\n` +
          `**Details:**\n${details}`,
      });

      await ch.send({
        content: `<@${interaction.user.id}> Support will be with you soon.`,
        embeds: [ticketEmbed],
      });

      return interaction.reply({
        content: `✅ Ticket created: <#${ch.id}>`,
        ephemeral: true,
      });
    }
  },
};
