const {
  entersState,
  getVoiceConnection,
  getVoiceConnections,
  joinVoiceChannel,
  VoiceConnectionStatus
} = require('@discordjs/voice');
const { PermissionsBitField } = require('discord.js');

const DEFAULT_VOICE_CHANNEL_ID = '1482116829634887690';
const READY_TIMEOUT_MS = 15000;
const RECONNECT_DELAY_MS = 5000;

function configuredVoiceChannelId() {
  return process.env.VOICE_CHANNEL_ID || DEFAULT_VOICE_CHANNEL_ID;
}

function clearVoiceReconnect(client) {
  if (!client.__voiceReconnectTimer) return;
  clearTimeout(client.__voiceReconnectTimer);
  client.__voiceReconnectTimer = null;
}

function scheduleReconnect(client, reason = 'voice connection changed') {
  if (!client.__voiceStayConnected || client.__voiceReconnectTimer) return;

  client.__voiceReconnectTimer = setTimeout(async () => {
    client.__voiceReconnectTimer = null;

    try {
      const { channel } = await ensureVoiceConnection(
        client,
        client.__targetVoiceChannelId || configuredVoiceChannelId()
      );
      console.log(`Voice presence reconnected to ${channel.name} (${channel.id}) after ${reason}.`);
    } catch (err) {
      console.error(`Voice presence reconnect failed after ${reason}:`, err.message);
      scheduleReconnect(client, 'retry');
    }
  }, RECONNECT_DELAY_MS);

  client.__voiceReconnectTimer.unref?.();
}

function attachVoiceGuards(client, connection) {
  if (connection.__magicUiVoiceGuardsAttached) return;
  connection.__magicUiVoiceGuardsAttached = true;

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    if (!client.__voiceStayConnected) return;

    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, RECONNECT_DELAY_MS),
        entersState(connection, VoiceConnectionStatus.Connecting, RECONNECT_DELAY_MS)
      ]);
    } catch {
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
      }

      scheduleReconnect(client, 'disconnect');
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    if (connection.__magicUiSkipReconnect) {
      connection.__magicUiSkipReconnect = false;
      return;
    }

    scheduleReconnect(client, 'destroyed connection');
  });
}

async function fetchVoiceChannel(client, channelId) {
  const channel = client.channels.cache.get(channelId) ||
    await client.channels.fetch(channelId).catch(() => null);

  if (!channel) {
    throw new Error(`I could not find voice channel ${channelId}.`);
  }

  if (!channel.isVoiceBased?.()) {
    throw new Error(`Channel ${channelId} is not a voice channel.`);
  }

  return channel;
}

async function assertCanJoin(channel, client) {
  const botMember = channel.guild.members.me ||
    await channel.guild.members.fetchMe().catch(() => null);
  const permissions = channel.permissionsFor(botMember || client.user);

  if (!permissions?.has(PermissionsBitField.Flags.ViewChannel)) {
    throw new Error(`I cannot view ${channel.name}.`);
  }

  if (!permissions.has(PermissionsBitField.Flags.Connect)) {
    throw new Error(`I do not have Connect permission for ${channel.name}.`);
  }
}

async function waitForReady(connection) {
  if (connection.state.status === VoiceConnectionStatus.Ready) return;
  await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
}

async function ensureVoiceConnection(client, channelId = configuredVoiceChannelId()) {
  client.__voiceStayConnected = true;
  client.__targetVoiceChannelId = channelId;
  clearVoiceReconnect(client);

  const channel = await fetchVoiceChannel(client, channelId);
  await assertCanJoin(channel, client);

  const existing = getVoiceConnection(channel.guild.id);
  if (existing?.joinConfig?.channelId === channel.id &&
    existing.state.status !== VoiceConnectionStatus.Destroyed) {
    attachVoiceGuards(client, existing);
    await waitForReady(existing);
    return { channel, connection: existing, reused: true };
  }

  if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) {
    existing.__magicUiSkipReconnect = true;
    existing.destroy();
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false
  });

  attachVoiceGuards(client, connection);
  await waitForReady(connection);

  return { channel, connection, reused: false };
}

async function startVoicePresence(client, channelId = configuredVoiceChannelId()) {
  client.__voiceStayConnected = true;
  client.__targetVoiceChannelId = channelId;

  try {
    return await ensureVoiceConnection(client, channelId);
  } catch (err) {
    scheduleReconnect(client, 'startup failure');
    throw err;
  }
}

function leaveVoiceConnection(client, guildId) {
  client.__voiceStayConnected = false;
  clearVoiceReconnect(client);

  const connection = getVoiceConnection(guildId);
  if (connection) {
    connection.destroy();
    return true;
  }

  const connections = getVoiceConnections();
  if (!connections?.size) return false;

  for (const activeConnection of connections.values()) {
    activeConnection.destroy();
  }

  return true;
}

module.exports = {
  DEFAULT_VOICE_CHANNEL_ID,
  configuredVoiceChannelId,
  ensureVoiceConnection,
  startVoicePresence,
  leaveVoiceConnection
};
