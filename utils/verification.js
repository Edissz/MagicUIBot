const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

const CFG = {
  VERIFY_CHANNEL_ID: "1459507747367424053",
  LOG_CHANNEL_ID: "1151318734158446624",
  ROLE_MEMBER_ID: "1459507375516942472",
  ROLE_UNVERIFIED_ID: "1459507394953609531",
  MIN_ACCOUNT_AGE_DAYS: 7,
  VERIFY_BUTTON_ID: "verify_run"
}

function isStaff(member) {
  if (!member) return false
  if (member.permissions?.has?.("Administrator")) return true
  if (member.permissions?.has?.(0x00000008)) return true
  return member.roles?.cache?.some(r => ["Moderator", "Administrator", "Manager"].includes(r.name))
}

function accountAgeDays(user) {
  const created = user?.createdTimestamp || 0
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24))
}

function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("✅ Verification Required")
    .setDescription(
      [
        "Click **Verify** to get access to the server.",
        "",
        `**Requirement:** Discord account age **${CFG.MIN_ACCOUNT_AGE_DAYS}+ days**`
      ].join("\n")
    )
    .setFooter({ text: "Magic UI • Verification" })
}

function panelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CFG.VERIFY_BUTTON_ID)
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  )
}

async function log(client, text) {
  const ch = await client.channels.fetch(CFG.LOG_CHANNEL_ID).catch(() => null)
  if (!ch || !ch.isTextBased()) return
  await ch.send({ content: text }).catch(() => {})
}

async function sendPanel(client) {
  const ch = await client.channels.fetch(CFG.VERIFY_CHANNEL_ID).catch(() => null)
  if (!ch || !ch.isTextBased()) return { ok: false, reason: "verify_channel_not_found" }

  await ch.send({ embeds: [panelEmbed()], components: [panelRow()] }).catch(() => null)
  return { ok: true }
}

async function addUnverified(member) {
  if (!member?.guild || member.user?.bot) return
  if (member.roles.cache.has(CFG.ROLE_UNVERIFIED_ID)) return
  const role = member.guild.roles.cache.get(CFG.ROLE_UNVERIFIED_ID)
  if (!role) return
  await member.roles.add(role).catch(() => {})
}

async function runVerify(interaction) {
  const guild = interaction.guild
  if (!guild) return

  const member = await guild.members.fetch(interaction.user.id).catch(() => null)
  if (!member) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({ content: "⚠️ Member not found.", ephemeral: true }).catch(() => {})
    }
    return
  }

  const age = accountAgeDays(interaction.user)
  if (age < CFG.MIN_ACCOUNT_AGE_DAYS) {
    const msg = `❌ Too new. Your account is **${age} days** old. Minimum is **${CFG.MIN_ACCOUNT_AGE_DAYS}**.`
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {})
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {})
    }
    return
  }

  const verifiedRole = guild.roles.cache.get(CFG.ROLE_MEMBER_ID)
  const unverifiedRole = guild.roles.cache.get(CFG.ROLE_UNVERIFIED_ID)

  if (!verifiedRole) {
    const msg = "⚠️ Verified role missing in server."
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {})
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {})
    }
    return
  }

  if (member.roles.cache.has(CFG.ROLE_MEMBER_ID)) {
    const msg = "✅ You’re already verified."
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {})
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {})
    }
    return
  }

  if (unverifiedRole && member.roles.cache.has(CFG.ROLE_UNVERIFIED_ID)) {
    await member.roles.remove(unverifiedRole).catch(() => {})
  }
  await member.roles.add(verifiedRole).catch(() => {})

  const ok = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Verified")
    .setDescription("Welcome to **Magic UI**. You now have access.")
    .setTimestamp()

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [ok], content: null }).catch(() => {})
  } else {
    await interaction.reply({ embeds: [ok], ephemeral: true }).catch(() => {})
  }

  await log(interaction.client, `✅ Verified: <@${member.id}> (${member.id}) • age=${age}d`).catch(() => {})
}

module.exports = {
  CFG,
  isStaff,
  sendPanel,
  addUnverified,
  runVerify,
  log
}
