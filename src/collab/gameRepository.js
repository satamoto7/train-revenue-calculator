import { normalizeAppState } from '../state/appState';
import { getSupabaseClient } from './supabaseClient';

const unwrapRow = (data) => {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
};

const subscribeChannel = (channel) =>
  new Promise((resolve, reject) => {
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(error || new Error('Realtime チャンネルの購読に失敗しました。'));
      }
    });
  });

const mapMemberRow = (row) => ({
  userId: row.user_id,
  nickname: row.nickname,
  joinedAt: row.joined_at,
  lastSeenAt: row.last_seen_at,
});

export async function signInAnonymously() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data?.user || data?.session?.user || null;
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function createGame({ initialState, nickname }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_game', {
    initial_state: normalizeAppState(initialState),
    nickname,
  });
  if (error) throw error;

  const row = unwrapRow(data);
  if (!row?.game_id || !row?.join_code) {
    throw new Error('create_game の戻り値が不正です。');
  }

  return {
    gameId: row.game_id,
    joinCode: row.join_code,
    state: normalizeAppState(row.state),
    version: Number(row.version || 1),
  };
}

export async function joinGame({ gameId, joinCode, nickname }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('join_game', {
    p_game_id: gameId,
    p_join_code: joinCode,
    p_nickname: nickname,
  });
  if (error) throw error;

  const row = unwrapRow(data);
  if (!row?.game_id) {
    throw new Error('join_game の戻り値が不正です。');
  }

  return {
    gameId: row.game_id,
    state: normalizeAppState(row.state),
    version: Number(row.version || 1),
  };
}

export async function loadGameState(gameId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('game_states')
    .select('state, version, updated_at, updated_by')
    .eq('game_id', gameId)
    .single();

  if (error) throw error;
  return {
    state: normalizeAppState(data?.state),
    version: Number(data?.version || 1),
    updatedAt: data?.updated_at || null,
    updatedBy: data?.updated_by || null,
  };
}

const isMissingSaveRpcError = (error) => {
  const message = `${error?.message || ''}`;
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    message.includes('save_game_state') ||
    message.includes('Could not find the function')
  );
};

export async function saveGameState(gameId, state) {
  const supabase = getSupabaseClient();
  const normalizedState = normalizeAppState(state);

  const { data, error } = await supabase.rpc('save_game_state', {
    game_id: gameId,
    next_state: normalizedState,
  });

  if (!error) {
    const row = unwrapRow(data);
    return {
      version: Number(row?.version || 1),
      updatedAt: row?.updated_at || null,
      updatedBy: row?.updated_by || null,
    };
  }

  if (!isMissingSaveRpcError(error)) {
    throw error;
  }

  const fallbackVersion = Date.now();
  const fallbackUpdatedAt = new Date().toISOString();
  let fallbackUserId = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    fallbackUserId = user?.id || null;
  } catch (_error) {
    fallbackUserId = null;
  }

  const fallbackPayload = {
    state: normalizedState,
    version: fallbackVersion,
    updated_at: fallbackUpdatedAt,
  };
  if (fallbackUserId) {
    fallbackPayload.updated_by = fallbackUserId;
  }

  const fallback = await supabase
    .from('game_states')
    .update(fallbackPayload)
    .eq('game_id', gameId)
    .select('version, updated_at, updated_by')
    .single();

  if (fallback.error) throw fallback.error;

  return {
    version: Number(fallback.data?.version || 1),
    updatedAt: fallback.data?.updated_at || null,
    updatedBy: fallback.data?.updated_by || null,
  };
}

export async function subscribeGameState(gameId, onUpdate) {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`game-state:${gameId}`).on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_states',
      filter: `game_id=eq.${gameId}`,
    },
    (payload) => {
      const next = payload?.new;
      if (!next) return;
      onUpdate({
        state: normalizeAppState(next.state),
        version: Number(next.version || 0),
        updatedAt: next.updated_at || null,
        updatedBy: next.updated_by || null,
      });
    }
  );

  await subscribeChannel(channel);
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function listGameMembers(gameId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('game_members')
    .select('user_id, nickname, joined_at, last_seen_at')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMemberRow);
}

export async function subscribeGameMembers(gameId, onChange) {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`game-members:${gameId}`).on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_members',
      filter: `game_id=eq.${gameId}`,
    },
    (payload) => {
      const row = payload?.new;
      if (!row) return;
      onChange(mapMemberRow(row));
    }
  );

  await subscribeChannel(channel);
  return () => {
    supabase.removeChannel(channel);
  };
}
