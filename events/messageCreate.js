const fs = require("fs");

let stats = { responses: 0, minutes: 0 };
if (fs.existsSync("./responseStats.json")) {
  stats = JSON.parse(fs.readFileSync("./responseStats.json", "utf8"));
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.channel.topic) return;
    if (!message.channel.topic.includes("OWNER:")) return;

    if (!client.__wait) client.__wait = {};
    const cid = message.channel.id;

    const isStaff =
      message.member.permissions.has("Administrator") ||
      message.member.roles.cache.some(r =>
        ["Moderator", "Administrator", "Manager"].includes(r.name)
      );

    if (!isStaff) {
      client.__wait[cid] = Date.now();
      return;
    }

    if (client.__wait[cid]) {
      const mins = Math.max(1, Math.round((Date.now() - client.__wait[cid]) / 60000));
      stats.responses += 1;
      stats.minutes += mins;
      fs.writeFileSync("./responseStats.json", JSON.stringify(stats));
      delete client.__wait[cid];
    }
  }
};
