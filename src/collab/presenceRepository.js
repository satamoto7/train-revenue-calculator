import { getSupabaseClient } from './supabaseClient';

const subscribeChannel = (channel) =>
  new Promise((resolve, reject) => {
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(error || new Error('Presence チャンネルの購読に失敗しました。'));
      }
    });
  });

const mapPresenceState = (presenceState) => {
  const profiles = [];
  Object.entries(presenceState || {}).forEach(([userId, metas]) => {
    (metas || []).forEach((meta) => {
      profiles.push({
        userId,
        nickname: meta?.nickname || 'Guest',
        onlineAt: meta?.onlineAt || null,
      });
    });
  });
  return profiles;
};

export async function trackPresence(gameId, profile, handlers = {}) {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`presence:game:${gameId}`, {
    config: {
      presence: {
        key: profile.userId,
      },
    },
  });

  channel.on('presence', { event: 'sync' }, () => {
    if (handlers.onSync) {
      handlers.onSync(mapPresenceState(channel.presenceState()));
    }
  });

  channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
    if (handlers.onJoin) {
      handlers.onJoin({
        userId: key,
        profiles: (newPresences || []).map((meta) => ({
          userId: key,
          nickname: meta?.nickname || 'Guest',
          onlineAt: meta?.onlineAt || null,
        })),
      });
    }
  });

  channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    if (handlers.onLeave) {
      handlers.onLeave({
        userId: key,
        profiles: (leftPresences || []).map((meta) => ({
          userId: key,
          nickname: meta?.nickname || 'Guest',
          onlineAt: meta?.onlineAt || null,
        })),
      });
    }
  });

  await subscribeChannel(channel);

  const { error } = await channel.track({
    userId: profile.userId,
    nickname: profile.nickname,
    onlineAt: new Date().toISOString(),
  });
  if (error) {
    throw error;
  }

  return async () => {
    await channel.untrack();
    supabase.removeChannel(channel);
  };
}
