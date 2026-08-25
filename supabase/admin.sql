-- To-cloud — administration
--
-- Trois ajouts : un role sur les profils, une table de demandes de stockage,
-- et les regles qui laissent un administrateur voir au-dela de ses propres
-- lignes. Tout reste applique par la base : le client ne decide de rien.
--
-- A executer une fois, puis se donner le role (derniere section).

-- ─────────── role et e-mail sur les profils ───────────

alter table profiles add column if not exists role  text not null default 'user';
alter table profiles add column if not exists email text;

-- L'e-mail vit dans auth.users, hors de portee de l'API. Le recopier ici est
-- le seul moyen d'afficher une liste de comptes lisible.
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',
             new.raw_user_meta_data->>'full_name',
             split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────── qui est administrateur ───────────

-- SECURITY DEFINER est indispensable : une regle posee sur `profiles` qui
-- interrogerait `profiles` sans cela tournerait en boucle.
create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

drop policy if exists "admin lit tous les profils" on profiles;
create policy "admin lit tous les profils"
  on profiles for select using (is_admin());

drop policy if exists "admin modifie tous les profils" on profiles;
create policy "admin modifie tous les profils"
  on profiles for update using (is_admin()) with check (is_admin());

-- ─────────── demandes de stockage ───────────

create table if not exists storage_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  email      text,
  plan_to    int  not null check (plan_to between 2 and 50),
  price_ar   int  not null,
  status     text not null default 'pending'
             check (status in ('pending', 'approved', 'rejected')),
  note       text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists requests_status_idx on storage_requests (status, created_at desc);

alter table storage_requests enable row level security;

drop policy if exists "demande visible par son auteur" on storage_requests;
create policy "demande visible par son auteur"
  on storage_requests for select using (auth.uid() = user_id or is_admin());

drop policy if exists "demande creee par son auteur" on storage_requests;
create policy "demande creee par son auteur"
  on storage_requests for insert with check (auth.uid() = user_id);

drop policy if exists "demande traitee par un admin" on storage_requests;
create policy "demande traitee par un admin"
  on storage_requests for update using (is_admin()) with check (is_admin());

-- ─────────── se donner le role ───────────

-- Le role ne s'accorde que d'ici. Aucun ecran de l'application ne permet de se
-- promouvoir : c'est ce qui empeche un compte ordinaire de devenir
-- administrateur en trafiquant une requete.
--
-- Remplacer l'adresse, puis executer :

-- update profiles set role = 'admin' where email = 'VOTRE-ADRESSE@gmail.com';

select email, role, round(quota / 1024.0^4, 2) as quota_to from profiles order by created_at;
