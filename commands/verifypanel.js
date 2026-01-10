const { sendPanel, isStaff } = require("../utils/verification")

module.exports = {
  name: "verifypanel",
  async execute(message, args, client) {
    if (!message.guild) return
    if (!isStaff(message.member)) return message.reply("⚠️ No permission.").catch(() => {})

    const res = await sendPanel(client)
    if (!res.ok) return message.reply(`⚠️ Failed: ${res.reason}`).catch(() => {})
    return message.reply("✅ Verification panel sent.").catch(() => {})
  }
}
