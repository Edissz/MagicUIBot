const {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js")

const PANEL_COOLDOWN_MS = 30000
const WHITE = 0xffffff
const BRAND = 0x2b79ee

const PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif"

module.exports = {
  name: "ticketpanel",
  aliases: ["ticketpad"],
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
        "**Welcome to MagicUI Support.**\n\n" +
          "Use this form when you need help with:\n" +
          "• Install / build / config / deploy issues\n" +
          "• Pro access & account permissions\n" +
          "• Billing & plan problems\n\n" +
          "**To get help faster:**\n" +
          "• Be specific (1 issue per request)\n" +
          "• Include what you already tried\n" +
          "• Add screenshots/logs if possible\n\n" +
          "Press **Contact Support** to open the support form.\n" +
          "You’ll receive a confirmation DM after submitting."
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
