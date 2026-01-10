const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

const VERIFY_CHANNEL_ID = "1459507747367424053"

async function sendVerifyPanel(client) {
  const channel = await client.channels.fetch(VERIFY_CHANNEL_ID).catch(() => null)
  if (!channel || !channel.isTextBased()) return

  const embed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle("✅ Verification Required")
    .setDescription("Click **Verify** to get access to the server.")
    .setFooter({ text: "Magic UI • Verification" })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_run")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  )

  await channel.send({ embeds: [embed], components: [row] })
}

module.exports = { sendVerifyPanel }
