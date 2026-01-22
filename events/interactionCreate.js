const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js")

const LOG_CHANNEL_ID = "1463916239528267839"
const WHITE = 0xffffff

function makeLogEmbed({ user, issue, tried, plan, email, channel }) {
  const e = new EmbedBuilder()
    .setColor(WHITE)
    .setTitle("New Support Contact")
    .setDescription(
      `**User:** ${user} \`(${user.id})\`\n` +
      `**From:** ${channel ? channel.toString() : "Unknown Channel"}\n` +
      `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
    )
    .addFields(
      { name: "Issue", value: (issue || "N/A").slice(0, 1024) },
      { name: "What you tried", value: (tried || "N/A").slice(0, 1024) },
      { name: "Plan", value: (plan || "N/A").slice(0, 1024) },
      { name: "Email (optional)", value: email && email.trim().length ? email.slice(0, 1024) : "N/A" }
    )
    .setFooter({ text: `REQ_USER:${user.id}` })
    .setTimestamp()

  return e
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isButton() && interaction.customId === "support_contact") {
        const modal = new ModalBuilder()
          .setCustomId("support_contact_modal")
          .setTitle("Contact Support")

        const issue = new TextInputBuilder()
          .setCustomId("support_issue")
          .setLabel("What issue are you experiencing?")
          .setPlaceholder("Describe what’s happening and what you need help with.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)

        const tried = new TextInputBuilder()
          .setCustomId("support_tried")
          .setLabel("What did you try already?")
          .setPlaceholder("List what you already tried to fix it.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)

        const plan = new TextInputBuilder()
          .setCustomId("support_plan")
          .setLabel("Which version? (Free or Pro)")
          .setPlaceholder("Free or Pro")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(20)

        const email = new TextInputBuilder()
          .setCustomId("support_email")
          .setLabel("Email (optional)")
          .setPlaceholder("Only if you want contact outside Discord")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(80)

        modal.addComponents(
          new ActionRowBuilder().addComponents(issue),
          new ActionRowBuilder().addComponents(tried),
          new ActionRowBuilder().addComponents(plan),
          new ActionRowBuilder().addComponents(email)
        )

        return interaction.showModal(modal)
      }

      if (interaction.isModalSubmit() && interaction.customId === "support_contact_modal") {
        await interaction.deferReply({ ephemeral: true })

        const guild = interaction.guild
        if (!guild) {
          return interaction.editReply({ content: "⚠️ This can only be used in a server." })
        }

        const issue = interaction.fields.getTextInputValue("support_issue")
        const tried = interaction.fields.getTextInputValue("support_tried")
        const plan = interaction.fields.getTextInputValue("support_plan")
        const email = interaction.fields.getTextInputValue("support_email") || ""

        const logChannel =
          guild.channels.cache.get(LOG_CHANNEL_ID) ||
          (await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null))

        if (!logChannel || !logChannel.isTextBased()) {
          return interaction.editReply({
            content: "⚠️ Log channel not found or not text-based. Please contact an administrator."
          })
        }

        const logEmbed = makeLogEmbed({
          user: interaction.user,
          issue,
          tried,
          plan,
          email,
          channel: interaction.channel
        })

        await logChannel.send({ embeds: [logEmbed] }).catch(() => null)

        return interaction.editReply({
          content: "✅ Submitted. Support has been notified and will respond when possible."
        })
      }
    } catch (err) {
      console.error("❌ interactionCreate error:", err)
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "⚠️ Something went wrong.", ephemeral: true })
        } else {
          await interaction.followUp({ content: "⚠️ Something went wrong.", ephemeral: true })
        }
      } catch {}
    }
  }
}
