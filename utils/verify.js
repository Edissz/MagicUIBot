const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require("discord.js")

const VERIFY_CHANNEL_ID = "1459507747367424053"
const LOG_CHANNEL_ID = "1151318734158446624"
const ROLE_VERIFIED_ID = "1459507375516942472"
const ROLE_UNVERIFIED_ID = "1459507394953609531"
const PANEL_COMMAND = "!verifypanel"
const MIN_ACCOUNT_AGE_DAYS = 3

function ageDays(user) {
  const created = user?.createdTimestamp || Date.now()
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24))
}

function isStaff(member) {
  if (!member) return false
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true
  return member.roles?.cache?.some(r => ["Moderator", "Administrator", "Manager"].includes(r.name))
}

async function sendLog(client, embed) {
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null)
  if (!ch || !ch.isTextBased()) return
  await ch.send({ embeds: [embed] }).catch(() => {})
}

async function postPanel(client) {
  const ch = await client.channels.fetch(VERIFY_CHANNEL_ID).catch(() => null)
  if (!ch || !ch.isTextBased()) return

  const embed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("Verify to access Magic UI")
    .setDescription("Click **Verify** and complete the quick check. After that, you’ll get access.")
    .setFooter({ text: "Magic UI • Verification" })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_start")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  )

  await ch.send({ embeds: [embed], components: [row] })
}

async function handleVerifyOnJoin(member) {
  if (!member?.guild || member.user?.bot) return false

  const unverified = member.guild.roles.cache.get(ROLE_UNVERIFIED_ID)
  if (unverified && !member.roles.cache.has(ROLE_UNVERIFIED_ID)) {
    await member.roles.add(unverified).catch(() => {})
  }

  const d = ageDays(member.user)
  const emb = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("Join")
    .setDescription(`User: <@${member.id}>\nID: \`${member.id}\`\nAccount age: \`${d}d\`\nAction: Unverified role added`)
    .setTimestamp(Date.now())

  await sendLog(member.client, emb)
  return true
}

async function handleVerifyPanelCommand(message, client) {
  if (!message?.guild) return false
  if (message.author?.bot) return false

  const content = (message.content || "").trim()
  if (content.toLowerCase() !== PANEL_COMMAND) return false
  if (!isStaff(message.member)) return false

  await postPanel(client || message.client)
  await message.react("✅").catch(() => {})
  return true
}

async function handleVerifyInteraction(interaction, client) {
  if (!interaction?.guild) return false

  const c = client || interaction.client
  if (!c.__verifyChallenges) c.__verifyChallenges = new Map()

  if (interaction.isButton() && interaction.customId === "verify_start") {
    const d = ageDays(interaction.user)
    if (d < MIN_ACCOUNT_AGE_DAYS) {
      const emb = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("Verification blocked")
        .setDescription(`Your account is too new (\`${d}d\`). Please try again later or contact staff.`)
      await interaction.reply({ embeds: [emb], ephemeral: true })
      return true
    }

    const a = Math.floor(Math.random() * 7) + 2
    const b = Math.floor(Math.random() * 7) + 2
    c.__verifyChallenges.set(interaction.user.id, { ans: String(a + b), exp: Date.now() + 2 * 60 * 1000 })

    const modal = new ModalBuilder()
      .setCustomId("verify_modal")
      .setTitle("Magic UI Verification")

    const input = new TextInputBuilder()
      .setCustomId("verify_answer")
      .setLabel(`What is ${a} + ${b}?`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(4)

    modal.addComponents(new ActionRowBuilder().addComponents(input))
    await interaction.showModal(modal)
    return true
  }

  if (interaction.isModalSubmit() && interaction.customId === "verify_modal") {
    const entry = c.__verifyChallenges.get(interaction.user.id)
    const given = (interaction.fields.getTextInputValue("verify_answer") || "").trim()

    if (!entry || entry.exp < Date.now()) {
      const emb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("Expired")
        .setDescription("Verification expired. Click **Verify** again.")
      await interaction.reply({ embeds: [emb], ephemeral: true })
      return true
    }

    if (given !== entry.ans) {
      c.__verifyChallenges.delete(interaction.user.id)
      const emb = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("Wrong answer")
        .setDescription("Click **Verify** and try again.")
      await interaction.reply({ embeds: [emb], ephemeral: true })
      return true
    }

    c.__verifyChallenges.delete(interaction.user.id)

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
    if (!member) return true

    const verifiedRole = interaction.guild.roles.cache.get(ROLE_VERIFIED_ID)
    const unverifiedRole = interaction.guild.roles.cache.get(ROLE_UNVERIFIED_ID)

    if (unverifiedRole) await member.roles.remove(unverifiedRole).catch(() => {})
    if (verifiedRole) await member.roles.add(verifiedRole).catch(() => {})

    const ok = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("Verified")
      .setDescription("You’re in. Welcome to Magic UI.")
      .setTimestamp(Date.now())

    await interaction.reply({ embeds: [ok], ephemeral: true })

    const d = ageDays(interaction.user)
    const logEmb = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("User verified")
      .setDescription(`User: <@${member.id}>\nID: \`${member.id}\`\nAccount age: \`${d}d\`\nRole: <@&${ROLE_VERIFIED_ID}> added`)
      .setTimestamp(Date.now())

    await sendLog(c, logEmb)
    return true
  }

  return false
}

module.exports = {
  handleVerifyOnJoin,
  handleVerifyPanelCommand,
  handleVerifyInteraction
}
