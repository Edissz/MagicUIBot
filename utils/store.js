import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

export function readConfig(guildId) {
  const file = path.join(dataDir, `${guildId}.json`);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return {}; }
}

export function writeConfig(guildId, cfg) {
  const file = path.join(dataDir, `${guildId}.json`);
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
}

/* ---------- MODERATION ---------- */
export function hasSetup(cfg) {
  const m = cfg?.moderation;
  return Boolean(m && m.logsChannelId && (m.modRoleIds?.length || m.adminRoleIds?.length));
}

export function mergeConfig(guildId, patch) {
  const cur = readConfig(guildId);
  const next = {
    ...cur,
    ...patch,
    moderation: { ...(cur.moderation || {}), ...(patch.moderation || {}) },
    tickets: { ...(cur.tickets || {}), ...(patch.tickets || {}) },
    aimonitor: { ...(cur.aimonitor || {}), ...(patch.aimonitor || {}) } // added AI Monitor merge
  };
  writeConfig(guildId, next);
  return next;
}

export function withDefaults(cfg = {}) {
  return {
    /* ---------- MODERATION ---------- */
    moderation: {
      modRoleIds: cfg?.moderation?.modRoleIds ?? [],
      adminRoleIds: cfg?.moderation?.adminRoleIds ?? [],
      logsChannelId: cfg?.moderation?.logsChannelId ?? null,
      bannerUrl: cfg?.moderation?.bannerUrl ?? null,
      settings: {
        dmsEnabled: cfg?.moderation?.settings?.dmsEnabled ?? true,
        logStyle: cfg?.moderation?.settings?.logStyle ?? 'compact',
        theme: cfg?.moderation?.settings?.theme ?? 'primary'
      },
      dmTemplates: {
        warn: cfg?.moderation?.dmTemplates?.warn ?? 'You have been **warned** in {server}. Reason: {reason}',
        timeout: cfg?.moderation?.dmTemplates?.timeout ?? 'You have been **timed out** in {server} for {duration}. Reason: {reason}',
        softban: cfg?.moderation?.dmTemplates?.softban ?? 'You have been **soft-banned** in {server}. Reason: {reason}',
        ban: cfg?.moderation?.dmTemplates?.ban ?? 'You have been **banned** in {server}. Reason: {reason}',
        kick: cfg?.moderation?.dmTemplates?.kick ?? 'You have been **kicked** from {server}. Reason: {reason}'
      },
      requireReason: cfg?.moderation?.requireReason ?? false,
      escalation: {
        enabled: cfg?.moderation?.escalation?.enabled ?? false,
        warnThreshold: cfg?.moderation?.escalation?.warnThreshold ?? 3,
        timeoutMinutes: cfg?.moderation?.escalation?.timeoutMinutes ?? 30
      }
    },

    /* ---------- TICKETS ---------- */
    tickets: {
      managerRoleIds: cfg?.tickets?.managerRoleIds ?? [],
      staffRoleIds: cfg?.tickets?.staffRoleIds ?? [],
      pingRoleIds: cfg?.tickets?.pingRoleIds ?? [],
      categoryId: cfg?.tickets?.categoryId ?? null,
      logsChannelId: cfg?.tickets?.logsChannelId ?? null,
      transcriptChannelId: cfg?.tickets?.transcriptChannelId ?? null,
      dmsEnabled: cfg?.tickets?.dmsEnabled ?? true,
      transcriptEnabled: cfg?.tickets?.transcriptEnabled ?? true,
      transcriptFormat: cfg?.tickets?.transcriptFormat ?? 'txt',
      channelNamePattern: cfg?.tickets?.channelNamePattern ?? 'ticket-${number}-${user}',
      claim: { lockOnClaim: cfg?.tickets?.claim?.lockOnClaim ?? true },
      counter: cfg?.tickets?.counter ?? 1,
      panel: {
        style: cfg?.tickets?.panel?.style ?? 'buttons',
        title: cfg?.tickets?.panel?.title ?? 'Need Help?',
        description: cfg?.tickets?.panel?.description ?? 'Open a ticket and our team will assist you.',
        largeImageUrl: cfg?.tickets?.panel?.largeImageUrl ?? null,
        selectPlaceholder: cfg?.tickets?.panel?.selectPlaceholder ?? 'Choose a ticket type',
        options: Array.isArray(cfg?.tickets?.panel?.options)
          ? cfg.tickets.panel.options
          : [
              { key: 'support', label: 'Support', description: 'General help', emoji: '🎫', style: 'Primary' },
              { key: 'reports', label: 'Report', description: 'Report an issue', emoji: '🚨', style: 'Secondary' }
            ]
      },
      ready: cfg?.tickets?.ready ?? false,
      activeTickets: cfg?.tickets?.activeTickets ?? {}
    },

    /* ---------- ANTI RAID ---------- */
    antiraid: {
      enabled: cfg?.antiraid?.enabled ?? true,
      active: cfg?.antiraid?.active ?? false,
      spam: {
        windowSec: cfg?.antiraid?.spam?.windowSec ?? 7,
        maxMsgs: cfg?.antiraid?.spam?.maxMsgs ?? 6,
        action: cfg?.antiraid?.spam?.action ?? 'timeout',
        timeoutMinutes: cfg?.antiraid?.spam?.timeoutMinutes ?? 10
      },
      joins: {
        windowSec: cfg?.antiraid?.joins?.windowSec ?? 30,
        maxJoins: cfg?.antiraid?.joins?.maxJoins ?? 6,
        action: cfg?.antiraid?.joins?.action ?? 'raidmode'
      },
      newAccountMinHours: cfg?.antiraid?.newAccountMinHours ?? 0,
      raidmode: {
        slowmodeSec: cfg?.antiraid?.raidmode?.slowmodeSec ?? 5,
        lockdown: cfg?.antiraid?.raidmode?.lockdown ?? false
      }
    },

    /* ---------- AI MONITOR ---------- */
    aimonitor: {
      enabled: cfg?.aimonitor?.enabled ?? false,
      channels: cfg?.aimonitor?.channels ?? [],
      topics: cfg?.aimonitor?.topics ?? ['toxicity', 'spam', 'hate', 'nsfw', 'offtopic', 'scam'],
      strictness: cfg?.aimonitor?.strictness ?? 2,
      actions: cfg?.aimonitor?.actions ?? {
        toxicity: 'warn',
        spam: 'delete',
        hate: 'ban',
        nsfw: 'delete',
        offtopic: 'log',
        scam: 'ban'
      },
      noticeChannelId: cfg?.aimonitor?.noticeChannelId ?? null,
      customRules: cfg?.aimonitor?.customRules ?? '',
      exemptRoles: cfg?.aimonitor?.exemptRoles ?? [],
      protectedRoles: cfg?.aimonitor?.protectedRoles ?? [],
      adminRoles: cfg?.aimonitor?.adminRoles ?? [],
      lastUpdatedBy: cfg?.aimonitor?.lastUpdatedBy ?? null,
      lastUpdatedAt: cfg?.aimonitor?.lastUpdatedAt ?? null
    },

    ...cfg
  };
}

/* ---------- TICKET HELPERS ---------- */
export function hasTicketSetup(cfg) {
  const t = cfg?.tickets;
  return Boolean(
    t &&
    t.ready &&
    t.categoryId &&
    t.logsChannelId &&
    Array.isArray(t.panel?.options) &&
    t.panel.options.length > 0
  );
}

export function mergeTicketConfig(guildId, patch) {
  const cur = readConfig(guildId);
  const next = { ...cur, tickets: { ...(cur.tickets || {}), ...(patch.tickets || {}) } };
  writeConfig(guildId, next);
  return next;
}
