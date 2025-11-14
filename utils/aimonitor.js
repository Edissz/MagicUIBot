import { EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { colors } from './colors.js';

export const AI_TOPICS = [
  { id: 'toxicity', label: 'Toxicity' },
  { id: 'spam', label: 'Spam' },
  { id: 'hate', label: 'Hate Speech' },
  { id: 'nsfw', label: 'NSFW' },
  { id: 'offtopic', label: 'Off-Topic' },
  { id: 'scam', label: 'Scam / Phishing' }
];

export const AI_ACTIONS = [
  { id: 'none', label: 'No Action' },
  { id: 'log', label: 'Log Only' },
  { id: 'warn', label: 'Warn' },
  { id: 'delete', label: 'Delete Message' },
  { id: 'timeout_10', label: 'Timeout 10m' },
  { id: 'timeout_60', label: 'Timeout 60m' },
  { id: 'kick', label: 'Kick' },
  { id: 'ban', label: 'Ban' }
];

export function defaultAIMonitorConfig() {
  const map = {};
  for (const t of AI_TOPICS) map[t.id] = 'log';
  return {
    enabled: true,
    channels: [],
    topics: AI_TOPICS.map(t => t.id),
    strictness: 2,
    actions: map,
    noticeChannelId: null,
    customRules: '',
    exemptRoles: [],
    protectedRoles: [],
    adminRoles: [],
    lastUpdatedBy: null,
    lastUpdatedAt: Date.now()
  };
}

export function buildNoticeEmbed(guildName) {
  return new EmbedBuilder()
    .setColor(colors.info)
    .setTitle('<:v9:1436068886653964318> AI Monitoring Notice')
    .setDescription(
      [
        '**This server uses AI features for message analysis.**',
        'Only **text messages** in selected channels are analyzed. Links, images, and files are not scanned.',
        'The system is in **Beta**; behavior and accuracy may evolve.',
        'By chatting here, you acknowledge automated moderation may apply (warn, delete, timeout, etc.).',
        'Questions? Contact the staff team.'
      ].join('\n')
    )
    .setFooter({ text: `${guildName} • Transparency Notice` })
    .setTimestamp();
}

export async function ensureOrUseNoticeChannel(guild, channelId) {
  if (channelId) {
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (ch) return ch;
  }
  const name = 'ai-monitoring';
  const existing = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === name
  );
  if (existing) return existing;
  const ch = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.roles.everyone, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  });
  return ch;
}
