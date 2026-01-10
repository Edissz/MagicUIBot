const { CFG, runVerify } = require("../utils/verification")

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (!client.__verifySeen) client.__verifySeen = new Set()
      if (client.__verifySeen.has(interaction.id)) return
      client.__verifySeen.add(interaction.id)
      setTimeout(() => client.__verifySeen.delete(interaction.id), 60000)

      if (!interaction.isButton()) return
      if (interaction.customId !== CFG.VERIFY_BUTTON_ID) return

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {})
      }
      await runVerify(interaction)
    } catch {}
  }
}
