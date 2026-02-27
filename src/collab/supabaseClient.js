import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

export const getSupabaseEnv = () => ({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export const hasSupabaseEnv = () => {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
};

export const getSupabaseClient = () => {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(
      'Supabase 環境変数が不足しています。VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を設定してください。'
    );
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
};

export const resetSupabaseClientForTest = () => {
  cachedClient = null;
};
