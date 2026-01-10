const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require("discord.js")

const cfg = require("./verifyConfig")
const challenges = new Map()

function ageDays(user) {
  const created = user?.createdTimestamp || Date.now()
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24))
}

async function log(client, embed) {
  const ch = await client.channels.fetch(cfg.LOG_CHANNEL_ID).catch(() => null)
  if (!ch || !ch.isTextBased()) return
  await ch.send({ embeds: [embed] }).catch(() => {})
}

async function sendPanel(client) {
  const ch = await client.channels.fetch(cfg.VERIFY_CHANNEL_ID).catch(() => null)
  if (!ch || !ch.isTextBased()) return

  const embed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("Verify to access MagicUI")
    .setDescription("Click **Verify** and complete the quick check to get access.")
    .setFooter({ text: "If you’re stuck, ping staff." })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("verify_start").setLabel("Verify").setStyle(ButtonStyle.Success)
  )

  await ch.send({ embeds: [embed], components: [row] })
}

module.exports = {
  async handleJoin(member) {
    if (!member || !member.guild || member.user?.bot) return

    const unverified = member.guild.roles.cache.get(cfg.ROLE_UNVERIFIED_ID)
    if (unverified && !member.roles.cache.has(cfg.ROLE_UNVERIFIED_ID)) {
      await member.roles.add(unverified).catch(() => {})
    }

    const d = ageDays(member.user)
    const emb = new EmbedBuilder()
      .setColor(0xffffff)
      .setTitle("Join")
      .setDescription(`User: <@${member.id}>\nID: \`${member.id}\`\nAccount age: \`${d}d\`\nAction: Unverified role added`)
      .setTimestamp(Date.now())

    await log(member.client, emb)
  },

  async handleMessage(message) {
    if (!message || !message.guild || message.author?.bot) return
    if ((message.content || "").trim().toLowerCase() !== cfg.PANEL_COMMAND) return

    const ok =
      message.member?.permissions?.has(PermissionsBitField.Flags.Administrator) ||
      message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild)

    if (!ok) return

    await sendPanel(message.client)
    await message.react("✅").catch(() => {})
  },

  async handleInteraction(interaction) {
    if (!interaction || !interaction.guild) return

    if (interaction.isButton() && interaction.customId === "verify_start") {
      const d = ageDays(interaction.user)
      if (d < cfg.MIN_ACCOUNT_AGE_DAYS) {
        const emb = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("Verification blocked")
          .setDescription(`Your account is too new (\`${d}d\`). Try later or contact staff.`)
        await interaction.reply({ embeds: [emb], ephemeral: true })
        return
      }

      const a = Math.floor(Math.random() * 7) + 2
      const b = Math.floor(Math.random() * 7) + 2
      challenges.set(interaction.user.id, { ans: String(a + b), exp: Date.now() + 2 * 60 * 1000 })

      const modal = new ModalBuilder().setCustomId("verify_modal").setTitle("MagicUI Verification")
      const input = new TextInputBuilder()
        .setCustomId("verify_answer")
        .setLabel(`What is ${a} + ${b}?`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(4)

      modal.addComponents(new ActionRowBuilder().addComponents(input))
      await interaction.showModal(modal)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === "verify_modal") {
      const entry = challenges.get(interaction.user.id)
      const given = (interaction.fields.getTextInputValue("verify_answer") || "").trim()

      if (!entry || entry.exp < Date.now()) {
        const emb = new EmbedBuilder().setColor(0xe74c3c).setTitle("Expired").setDescription("Click **Verify** again.")
        await interaction.reply({ embeds: [emb], ephemeral: true })
        return
      }

      if (given !== entry.ans) {
        challenges.delete(interaction.user.id)
        const emb = new EmbedBuilder().setColor(0xe74c3c).setTitle("Wrong answer").setDescription("Click **Verify** and try again.")
        await interaction.reply({ embeds: [emb], ephemeral: true })
        return
      }

      challenges.delete(interaction.user.id)

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
      if (!member) return

      const verified = interaction.guild.roles.cache.get(cfg.ROLE_VERIFIED_ID)
      const unverified = interaction.guild.roles.cache.get(cfg.ROLE_UNVERIFIED_ID)

      if (unverified) await member.roles.remove(unverified).catch(() => {})
      if (verified) await member.roles.add(verified).catch(() => {})

      const ok = new EmbedBuilder().setColor(0x2ecc71).setTitle("Verified").setDescription("Welcome to MagicUI.").setTimestamp(Date.now())
      await interaction.reply({ embeds: [ok], ephemeral: true })

      const d = ageDays(interaction.user)
      const logEmb = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("User verified")
        .setDescription(`User: <@${member.id}>\nID: \`${member.id}\`\nAccount age: \`${d}d\`\nRole: <@&${cfg.ROLE_VERIFIED_ID}> added`)
        .setTimestamp(Date.now())

      await log(interaction.client, logEmb)
    }
  },
}
