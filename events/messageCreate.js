const fs = require("fs");
const path = require("path");
const { PermissionsBitField } = require("discord.js");
const { handleTicketMessage } = require("../utils/ticketStats");

const STATS_PATH = path.join(__dirname, "..", "responseStats.json");

let stats = { responses: 0, minutes: 0 };
if (fs.existsSync(STATS_PATH)) {
  try {
    stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));
  } catch { }
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message?.id) return;
    if (message.author?.bot) return;

    if (!client.__seen) client.__seen = new Map();
    const now = Date.now();
    const last = client.__seen.get(message.id);
    if (last && now - last < 8000) return;
    client.__seen.set(message.id, now);

    if (client.__seen.size > 5000) {
      for (const [k, t] of client.__seen) {
        if (now - t > 60000) client.__seen.delete(k);
      }
    }

    if (!message.guild) return;

    try {
      await handleTicketMessage(message, client);
    } catch { }

    const prefix = client.prefix || "!";
    if (message.content?.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift()?.toLowerCase();
      if (!commandName) return;

      const command = client.commands.get(commandName);
      if (!command) return;

      try {
        await command.execute(message, args, client);
      } catch (err) {
        console.error(`❌ Error running ${commandName}:`, err);
        try {
          await message.reply("⚠️ Error executing this command.");
        } catch { }
      }
      return;
    }

    if (!message.member) return;
    if (!message.channel?.topic) return;
    if (!message.channel.topic.includes("OWNER:")) return;

    if (!client.__wait) client.__wait = {};
    const cid = message.channel.id;

    const isStaff =
      message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      message.member.roles.cache.some((r) => ["Moderator", "Administrator", "Manager"].includes(r.name));

    if (!isStaff) {
      client.__wait[cid] = Date.now();
      return;
    }

    if (client.__wait[cid]) {
      const diffMs = Date.now() - client.__wait[cid];
      const mins = Math.max(1, Math.round(diffMs / 60000));

      stats.responses += 1;
      stats.minutes += mins;

      try {
        fs.writeFileSync(STATS_PATH, JSON.stringify(stats));
      } catch { }

      delete client.__wait[cid];
    }
  },
};
