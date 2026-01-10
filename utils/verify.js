const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js")

const VERIFY_CHANNEL_ID = "1459507747367424053"

function buildVerifyPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("Verification Required")
    .setDescription("Click **Verify** below to get access to the server.")
    .setFooter({ text: "Magic UI - Verification" })
}

function buildVerifyPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_run")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  )
}

async function sendVerifyPanel(client, channelId = VERIFY_CHANNEL_ID) {
  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel || !channel.isTextBased()) return { ok: false, reason: "channel_not_found" }

  const me = channel.guild?.members?.me
  if (me) {
    const perms = channel.permissionsFor(me)
    if (!perms?.has(PermissionsBitField.Flags.ViewChannel)) return { ok: false, reason: "no_view" }
    if (!perms?.has(PermissionsBitField.Flags.SendMessages)) return { ok: false, reason: "no_send" }
    if (!perms?.has(PermissionsBitField.Flags.ReadMessageHistory)) return { ok: false, reason: "no_history" }
  }

  await channel.send({ embeds: [buildVerifyPanelEmbed()], components: [buildVerifyPanelRow()] })
  return { ok: true }
}

async function handleVerifyPanelCommand(message, client) {
  if (!message.guild) return false
  if (!message.content) return false

  const content = message.content.trim()
  if (content.toLowerCase() !== "!verifypanel") return false

  const isStaff =
    message.member?.permissions?.has(PermissionsBitField.Flags.Administrator) ||
    message.member?.roles?.cache?.some(r => ["Moderator", "Administrator", "Manager"].includes(r.name))

  if (!isStaff) {
    await message.reply("⚠️ You can’t use this.").catch(() => null)
    return true
  }

  const res = await sendVerifyPanel(client).catch(() => ({ ok: false, reason: "send_failed" }))

  if (res?.ok) {
    await message.reply("✅ Verification panel sent.").catch(() => null)
  } else {
    await message.reply(`⚠️ Failed to send panel (${res?.reason || "unknown"}).`).catch(() => null)
  }

  return true
}

module.exports = {
  sendVerifyPanel,
  handleVerifyPanelCommand
}
