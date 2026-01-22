const {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js")

const PANEL_COOLDOWN_MS = 30000
const WHITE = 0xffffff

const PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif"

module.exports = {
  name: "ticketpanel",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply("<:cross:1430525603701850165> You lack permission.")
    }

    if (!client.__panelCooldown) client.__panelCooldown = new Map()
    const last = client.__panelCooldown.get(message.channel.id) || 0
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      return message.reply("<:cross:1430525603701850165> Please wait before sending another panel.")
    }
    client.__panelCooldown.set(message.channel.id, Date.now())

    const icon =
      message.guild?.iconURL?.({ dynamic: true, size: 128 }) ||
      client?.user?.displayAvatarURL?.({ dynamic: true, size: 128 }) ||
      undefined

    const embed = new EmbedBuilder()
      .setColor(WHITE)
      .setAuthor({ name: "MagicUI Support", iconURL: icon })
      .setTitle("Contact MagicUI Support")
      .setDescription(
        "**Need help with MagicUI?**\n\n" +
          "Use this support form for:\n" +
          "• Technical issues (install/build/config/deploy)\n" +
          "• Account access / permissions\n" +
          "• Billing & plan issues\n\n" +
          "**Before submitting:**\n" +
          "• Add clear steps + screenshots/logs\n" +
          "• Pick your plan (Free/Pro)\n" +
          "• Keep it focused (1 issue per request)\n\n" +
          "Press **Contact Support** to open the form. Our team will respond as soon as possible."
      )
      .setImage(PANEL_IMAGE)
      .setFooter({ text: "MagicUI Support" })
      .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support_contact")
        .setLabel("Contact Support")
        .setStyle(ButtonStyle.Primary)
    )

    await message.channel.send({ embeds: [embed], components: [row] })

    return message.reply("<:check:1430525546608988203> Support panel posted.")
  }
}
