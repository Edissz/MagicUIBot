const processed = new Set();
const verificationPrompts = new Map();
const {
  VERIFIED_ROLE_ID,
  V2_FLAGS,
  buildUnverifiedPromptComponents
} = require('../utils/supportV2');

const VERIFICATION_PROMPT_COOLDOWN_MS = 10 * 1000;
const VERIFICATION_PROMPT_DELETE_MS = 5 * 1000;

async function sendVerificationPrompt(message) {
  const key = `${message.guild.id}:${message.author.id}`;
  const lastPrompt = verificationPrompts.get(key) || 0;
  if (Date.now() - lastPrompt < VERIFICATION_PROMPT_COOLDOWN_MS) return;

  verificationPrompts.set(key, Date.now());

  const prompt = await message.reply({
    components: buildUnverifiedPromptComponents(message.author, message.guild.id),
    flags: V2_FLAGS,
    allowedMentions: {
      users: [message.author.id],
      repliedUser: true
    }
  }).catch(err => {
    console.warn(`Could not send verification prompt to ${message.author.tag}:`, err.message);
  });

  if (prompt) {
    setTimeout(() => {
      prompt.delete().catch(() => null);
    }, VERIFICATION_PROMPT_DELETE_MS);
  }
}

async function handleUnverifiedMessage(message) {
  const member = message.member;
  if (!member || member.roles.cache.has(VERIFIED_ROLE_ID)) return false;

  await sendVerificationPrompt(message);
  await message.delete().catch(() => null);
  return true;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (await handleUnverifiedMessage(message)) return;

    const prefixes = [client.prefix || '!', '.'];
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    if (processed.has(message.id)) return;
    processed.add(message.id);

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => processed.delete(message.id), 15000);
    }
  },
};
