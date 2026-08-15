-- Sprint 1 schema (run first if not already done)
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  created_at timestamptz default now(),
  display_name text,
  onboarding_complete boolean default false,
  premium_status boolean default false,
  notification_prefs jsonb default '{"daily_checkin": true, "streak_alerts": true, "high_risk": true}'::jsonb,
  onboarding_data jsonb
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  start_date date not null,
  last_checkin_at timestamptz,
  current_streak_days integer default 0,
  longest_streak_days integer default 0,
  total_clean_days integer default 0,
  weekly_bet_estimate numeric default 0
);

alter table public.profiles enable row level security;
alter table public.streaks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users read own profile') then
    create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users insert own profile') then
    create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users update own profile') then
    create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='streaks' and policyname='Users read own streak') then
    create policy "Users read own streak" on public.streaks for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='streaks' and policyname='Users insert own streak') then
    create policy "Users insert own streak" on public.streaks for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='streaks' and policyname='Users update own streak') then
    create policy "Users update own streak" on public.streaks for update using (auth.uid() = user_id);
  end if;
end $$;

-- Sprint 2 schema
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  date date not null,
  urge_level integer check (urge_level between 1 and 10),
  mood text check (mood in ('great','good','neutral','bad','terrible')),
  triggers text[],
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists public.relapses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  relapsed_at timestamptz default now(),
  notes text
);

alter table public.checkins enable row level security;
alter table public.relapses enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='checkins' and policyname='Users manage own checkins') then
    create policy "Users manage own checkins" on public.checkins for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='relapses' and policyname='Users manage own relapses') then
    create policy "Users manage own relapses" on public.relapses for all using (auth.uid() = user_id);
  end if;
end $$;

-- Streak checkin function (server-side, prevents clock manipulation)
create or replace function public.handle_checkin(
  p_user_id uuid,
  p_urge_level integer,
  p_mood text,
  p_triggers text[],
  p_notes text
)
returns json
language plpgsql
security definer
as $$
declare
  v_streak record;
  v_today date := current_date;
  v_last_date date;
  v_new_streak integer;
begin
  -- Prevent duplicate checkins on same UTC day
  if exists (
    select 1 from public.checkins
    where user_id = p_user_id and date = v_today
  ) then
    return json_build_object('error', 'Already checked in today');
  end if;

  -- Insert checkin
  insert into public.checkins (user_id, date, urge_level, mood, triggers, notes)
  values (p_user_id, v_today, p_urge_level, p_mood, p_triggers, p_notes);

  -- Get current streak
  select * into v_streak from public.streaks where user_id = p_user_id;

  v_last_date := v_streak.last_checkin_at::date;

  -- Calculate new streak
  if v_last_date is null or v_last_date < v_today - interval '1 day' then
    v_new_streak := 1; -- reset or first checkin
  else
    v_new_streak := v_streak.current_streak_days + 1;
  end if;

  -- Update streak
  update public.streaks set
    current_streak_days = v_new_streak,
    longest_streak_days = greatest(longest_streak_days, v_new_streak),
    total_clean_days = total_clean_days + 1,
    last_checkin_at = now()
  where user_id = p_user_id;

  -- Return updated streak
  select * into v_streak from public.streaks where user_id = p_user_id;
  return row_to_json(v_streak);
end;
$$;

-- Relapse function (resets streak but preserves total_clean_days)
create or replace function public.handle_relapse(
  p_user_id uuid,
  p_notes text
)
returns json
language plpgsql
security definer
as $$
declare
  v_streak record;
begin
  -- Insert relapse record
  insert into public.relapses (user_id, notes)
  values (p_user_id, p_notes);

  -- Reset current streak only, preserve total clean days
  update public.streaks set
    current_streak_days = 0,
    start_date = current_date,
    last_checkin_at = null
  where user_id = p_user_id;

  select * into v_streak from public.streaks where user_id = p_user_id;
  return row_to_json(v_streak);
end;
$$;

-- Avatar system (Sprint 3)
create table if not exists public.user_avatar (
  user_id uuid references public.profiles primary key,
  recovery_points integer default 0,
  owned_items text[] default '{}',
  equipped jsonb default '{"hat": null, "outfit": "outfit_bowtie", "background": "bg_white", "accessory": "acc_sparkle"}'
);

alter table public.user_avatar enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_avatar' and policyname='Users manage own avatar') then
    create policy "Users manage own avatar" on public.user_avatar for all using (auth.uid() = user_id);
  end if;
end $$;

-- Sprint 4 schema
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  content text not null check (char_length(content) <= 500),
  category text check (category in ('need_help','won_today','tips')),
  upvotes integer default 0,
  flagged boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.post_upvotes (
  user_id uuid references public.profiles not null,
  post_id uuid references public.posts not null,
  primary key (user_id, post_id)
);

create table if not exists public.trigger_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  triggers text[],
  urge_level integer check (urge_level between 1 and 10),
  notes text,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;
alter table public.post_upvotes enable row level security;
alter table public.trigger_journal enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='posts' and policyname='Anyone can read posts') then
    create policy "Anyone can read posts" on public.posts for select using (not flagged);
  end if;
  if not exists (select 1 from pg_policies where tablename='posts' and policyname='Users create posts') then
    create policy "Users create posts" on public.posts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='post_upvotes' and policyname='Users manage own upvotes') then
    create policy "Users manage own upvotes" on public.post_upvotes for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='trigger_journal' and policyname='Users manage own journal') then
    create policy "Users manage own journal" on public.trigger_journal for all using (auth.uid() = user_id);
  end if;
end $$;

-- Atomic upvote functions (prevents race conditions)
create or replace function public.increment_post_upvotes(post_id uuid)
returns void language sql security definer as $$
  update public.posts set upvotes = upvotes + 1 where id = post_id;
$$;

create or replace function public.decrement_post_upvotes(post_id uuid)
returns void language sql security definer as $$
  update public.posts set upvotes = greatest(0, upvotes - 1) where id = post_id;
$$;

-- Sprint 5: SOS sessions
create table if not exists public.sos_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  step_reached integer default 1,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.sos_sessions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='sos_sessions' and policyname='Users manage own sos sessions') then
    create policy "Users manage own sos sessions" on public.sos_sessions for all using (auth.uid() = user_id);
  end if;
end $$;

-- Sprint 6: Accountability partner
create table if not exists public.accountability_pairs (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references public.profiles not null,
  user_b uuid references public.profiles,
  bet_type text,
  region text,
  status text default 'waiting' check (status in ('waiting','matched','ended')),
  created_at timestamptz default now()
);

create table if not exists public.partner_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid references public.accountability_pairs not null,
  sender_id uuid references public.profiles not null,
  content text not null,
  sent_at timestamptz default now()
);

alter table public.accountability_pairs enable row level security;
alter table public.partner_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='accountability_pairs' and policyname='Users manage own pairs') then
    create policy "Users manage own pairs" on public.accountability_pairs for all using (auth.uid() = user_a or auth.uid() = user_b);
  end if;
  if not exists (select 1 from pg_policies where tablename='partner_messages' and policyname='Users in pair can message') then
    create policy "Users in pair can message" on public.partner_messages for all using (
      exists (
        select 1 from public.accountability_pairs
        where id = pair_id and (user_a = auth.uid() or user_b = auth.uid())
      )
    );
  end if;
end $$;
