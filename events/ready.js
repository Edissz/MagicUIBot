const { sendVerifyPanel } = require("../utils/verifyPanel")

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`)
    await sendVerifyPanel(client)
  }
}
