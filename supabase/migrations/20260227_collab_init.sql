create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique check (join_code ~ '^[0-9]{6}$'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.game_members (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) > 0),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create table if not exists public.game_states (
  game_id uuid primary key references public.games (id) on delete cascade,
  state jsonb not null,
  version bigint not null default 1,
  updated_by uuid not null references auth.users (id),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := lpad(((random() * 999999)::int)::text, 6, '0');
    exit when not exists(select 1 from public.games where join_code = candidate);
  end loop;

  return candidate;
end;
$$;

create or replace function public.create_game(initial_state jsonb, nickname text)
returns table(game_id uuid, join_code text, state jsonb, version bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_game_id uuid;
  created_join_code text;
  normalized_name text;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  normalized_name := coalesce(nullif(trim(nickname), ''), 'Guest');
  created_join_code := public.generate_join_code();

  insert into public.games (join_code, created_by)
  values (created_join_code, auth.uid())
  returning id into created_game_id;

  insert into public.game_members (game_id, user_id, nickname)
  values (created_game_id, auth.uid(), normalized_name);

  insert into public.game_states (game_id, state, version, updated_by)
  values (created_game_id, coalesce(initial_state, '{}'::jsonb), 1, auth.uid());

  return query
    select gs.game_id, g.join_code, gs.state, gs.version
    from public.game_states gs
    join public.games g on g.id = gs.game_id
    where gs.game_id = created_game_id;
end;
$$;

create or replace function public.join_game(
  p_game_id uuid,
  p_join_code text,
  p_nickname text
)
returns table(game_id uuid, state jsonb, version bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  if not exists (
    select 1
    from public.games g
    where g.id = join_game.p_game_id
      and g.join_code = join_game.p_join_code
  ) then
    raise exception 'invalid game_id or join_code';
  end if;

  normalized_name := coalesce(nullif(trim(join_game.p_nickname), ''), 'Guest');

  insert into public.game_members (game_id, user_id, nickname, last_seen_at)
  values (join_game.p_game_id, auth.uid(), normalized_name, now())
  on conflict (game_id, user_id)
  do update set
    nickname = excluded.nickname,
    last_seen_at = now();

  return query
    select gs.game_id, gs.state, gs.version
    from public.game_states gs
    where gs.game_id = join_game.p_game_id;
end;
$$;

create or replace function public.save_game_state(game_id uuid, next_state jsonb)
returns table(version bigint, updated_at timestamptz, updated_by uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  if not exists (
    select 1
    from public.game_members gm
    where gm.game_id = save_game_state.game_id
      and gm.user_id = auth.uid()
  ) then
    raise exception 'not a member of this game';
  end if;

  update public.game_states gs
  set
    state = coalesce(next_state, '{}'::jsonb),
    version = gs.version + 1,
    updated_by = auth.uid(),
    updated_at = now()
  where gs.game_id = save_game_state.game_id;

  update public.game_members gm
  set last_seen_at = now()
  where gm.game_id = save_game_state.game_id
    and gm.user_id = auth.uid();

  return query
    select gs.version, gs.updated_at, gs.updated_by
    from public.game_states gs
    where gs.game_id = save_game_state.game_id;
end;
$$;

alter table public.games enable row level security;
alter table public.game_members enable row level security;
alter table public.game_states enable row level security;

create or replace function public.is_game_member(
  p_game_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_members gm
    where gm.game_id = p_game_id
      and gm.user_id = p_user_id
  );
$$;

drop policy if exists games_select_member_only on public.games;
create policy games_select_member_only
  on public.games
  for select
  using (
    created_by = auth.uid()
    or public.is_game_member(id)
  );

drop policy if exists game_members_member_only on public.game_members;
create policy game_members_member_only
  on public.game_members
  for select
  using (
    public.is_game_member(game_id)
  );

drop policy if exists game_members_update_self on public.game_members;
create policy game_members_update_self
  on public.game_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists game_states_member_read on public.game_states;
create policy game_states_member_read
  on public.game_states
  for select
  using (
    public.is_game_member(game_id)
  );

drop policy if exists game_states_member_update on public.game_states;
create policy game_states_member_update
  on public.game_states
  for update
  using (
    public.is_game_member(game_id)
  )
  with check (
    public.is_game_member(game_id)
  );

grant execute on function public.is_game_member(uuid, uuid) to authenticated;
grant execute on function public.create_game(jsonb, text) to authenticated;
grant execute on function public.join_game(uuid, text, text) to authenticated;
grant execute on function public.save_game_state(uuid, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_states'
  ) then
    alter publication supabase_realtime add table public.game_states;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_members'
  ) then
    alter publication supabase_realtime add table public.game_members;
  end if;
end
$$;
