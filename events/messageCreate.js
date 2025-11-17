const fs = require("fs");
const { PermissionsBitField } = require("discord.js");

let stats = { responses: 0, minutes: 0 };
if (fs.existsSync("./responseStats.json")) {
  try { stats = JSON.parse(fs.readFileSync("./responseStats.json", "utf8")); } catch {}
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message || !message.member) return;
    if (message.author.bot) return;
    if (!message.channel.topic) return;
    if (!message.channel.topic.includes("OWNER:")) return;

    if (!client.__wait) client.__wait = {};
    const cid = message.channel.id;

    const isStaff =
      message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      message.member.roles.cache.some(r =>
        ["Moderator", "Administrator", "Manager"].includes(r.name)
      );

    if (!isStaff) {
      client.__wait[cid] = Date.now();
      return;
    }

    if (client.__wait[cid]) {
      const now = Date.now();
      const diffMs = now - client.__wait[cid];
      const mins = Math.max(1, Math.round(diffMs / 60000));

      stats.responses += 1;
      stats.minutes += mins;

      try {
        fs.writeFileSync("./responseStats.json", JSON.stringify(stats));
      } catch {}

      delete client.__wait[cid];
    }
  }
};
