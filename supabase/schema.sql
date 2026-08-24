-- To-cloud — schema Postgres
-- A coller dans Supabase → SQL Editor → Run.
--
-- Le script peut etre relance sans risque : chaque objet est cree seulement
-- s'il manque, et les regles sont retirees avant d'etre reposees.
--
-- Toute la protection est ici, pas dans le code applicatif : meme si le Worker
-- ou le client comporte un bug, la base refuse de rendre les lignes d'autrui.

-- ─────────── profils ───────────

create table if not exists profiles (
  id       uuid primary key references auth.users on delete cascade,
  name     text,
  quota    bigint not null default 536870912000,   -- 500 Go
  used     bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profil visible par son proprietaire" on profiles;
create policy "profil visible par son proprietaire"
  on profiles for select using (auth.uid() = id);

drop policy if exists "profil modifiable par son proprietaire" on profiles;
create policy "profil modifiable par son proprietaire"
  on profiles for update using (auth.uid() = id);

-- le profil naît avec le compte : sans cela, un nouvel utilisateur n'aurait
-- aucun quota et le premier envoi echouerait
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────── dossiers ───────────

create table if not exists folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists folders_user_idx on folders (user_id, created_at desc);

alter table folders enable row level security;

drop policy if exists "dossiers du proprietaire" on folders;
create policy "dossiers du proprietaire"
  on folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────── fichiers ───────────

create table if not exists files (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  size       bigint not null check (size >= 0),
  cat        text not null check (cat in ('sary','video','feo','doc','apk','hafa')),
  folder_id  uuid references folders on delete set null,
  thumb      text,                                  -- vignette WebP en dataURL
  created_at timestamptz not null default now(),
  deleted_at timestamptz                            -- corbeille : rempli = supprime
);

create index if not exists files_user_idx    on files (user_id, deleted_at, created_at desc);
create index if not exists files_cat_idx     on files (user_id, cat, deleted_at, created_at desc);
create index if not exists files_folder_idx  on files (user_id, folder_id, deleted_at, created_at desc);
create index if not exists files_name_idx    on files using gin (to_tsvector('simple', name));

alter table files enable row level security;

drop policy if exists "fichiers du proprietaire" on files;
create policy "fichiers du proprietaire"
  on files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────── morceaux ───────────

create table if not exists chunks (
  file_id       uuid not null references files on delete cascade,
  idx           int  not null,
  tg_file_id    text not null,
  tg_message_id bigint,
  bot           int  not null default 0,
  size          int  not null,
  primary key (file_id, idx)
);

alter table chunks enable row level security;

-- un morceau suit le sort de son fichier : c'est ce qui empeche d'aller
-- chercher les morceaux de quelqu'un d'autre en devinant un identifiant
drop policy if exists "morceaux du proprietaire" on chunks;
create policy "morceaux du proprietaire"
  on chunks for all
  using (exists (select 1 from files f where f.id = chunks.file_id and f.user_id = auth.uid()))
  with check (exists (select 1 from files f where f.id = chunks.file_id and f.user_id = auth.uid()));

-- ─────────── quota ───────────

-- Le quota se met a jour tout seul. Le calculer a la lecture couterait un
-- balayage complet a chaque ouverture de l'application.
create or replace function sync_used()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set used = used + new.size where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update profiles set used = greatest(0, used - old.size) where id = old.user_id;
  end if;
  return null;
end $$;

drop trigger if exists files_sync_used on files;
create trigger files_sync_used
  after insert or delete on files
  for each row execute function sync_used();

-- ─────────── partage ───────────

create table if not exists shares (
  id         uuid primary key default gen_random_uuid(),
  file_id    uuid not null references files on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists shares_file_idx on shares (file_id);

alter table shares enable row level security;

drop policy if exists "partages du proprietaire" on shares;
create policy "partages du proprietaire"
  on shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────── vue des compteurs ───────────

-- Evite de ramener tous les fichiers juste pour afficher « 842 · 1,2 Go »
create or replace view file_counts
with (security_invoker = true) as
  select user_id, cat, count(*)::int as n, coalesce(sum(size), 0)::bigint as bytes
  from files
  where deleted_at is null
  group by user_id, cat;
