const {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js")

const PANEL_COOLDOWN_MS = 30000
const WHITE = 0xffffff

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
      .setTitle("Contact Support")
      .setDescription(
        "Press **Contact Support** to open the form.\n\n" +
        "Please include:\n" +
        "• What issue you’re experiencing\n" +
        "• What you tried already\n" +
        "• Whether you’re on **Free** or **Pro**\n" +
        "• Optional email (only if you want contact outside Discord)"
      )
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
