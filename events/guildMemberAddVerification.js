const { addUnverified, log } = require("../utils/verification")

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    await addUnverified(member)
    await log(member.client, `👤 Join: <@${member.id}> (${member.id}) → added Unverified`).catch(() => {})
  }
}
