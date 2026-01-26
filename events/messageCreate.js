function levenshtein(a, b) {
  a = String(a || "");
  b = String(b || "");
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const prefix = client.prefix || "!";
    const content = message.content || "";
    if (!content.startsWith(prefix)) return;

    const args = content.slice(prefix.length).trim().split(/\s+/);
    let commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    if (commandName === "tickewtpanel") commandName = "ticketpanel";

    let command = client.commands.get(commandName);

    if (!command) {
      const names = [...client.commands.keys()];
      let best = null;
      let bestScore = Infinity;

      for (const name of names) {
        const d = levenshtein(commandName, name);
        if (d < bestScore) {
          bestScore = d;
          best = name;
        }
      }

      if (best && bestScore <= 3) {
        try {
          await message.reply(`⚠️ Unknown command \`${commandName}\`. Did you mean \`${prefix}${best}\`?`);
        } catch { }
      }
      return;
    }

    try {
      await command.execute(message, args, client);
      console.log(`✅ Command executed: ${commandName}`);
    } catch (err) {
      console.error(`❌ Error running ${commandName}:`, err);
      try {
        await message.reply("⚠️ Error executing this command.");
      } catch { }
    }
  },
};
