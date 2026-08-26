-- Reglages publics
--
-- L'ecran de connexion annonce l'offre gratuite avant toute session : il ne
-- peut donc rien lire dans `profiles`, protege par RLS. Une table de reglages
-- lisible par tous resout le probleme, sans rien exposer d'autre.

create table if not exists settings (
  key   text primary key,
  value text not null
);

alter table settings enable row level security;

drop policy if exists "reglages lisibles par tous" on settings;
create policy "reglages lisibles par tous"
  on settings for select using (true);

drop policy if exists "reglages modifiables par un admin" on settings;
create policy "reglages modifiables par un admin"
  on settings for all using (is_admin()) with check (is_admin());

-- valeur de depart : le quota le plus repandu aujourd'hui
insert into settings (key, value)
select 'free_quota', coalesce(
  (select quota::text from profiles group by quota order by count(*) desc limit 1),
  '1099511627776'
)
on conflict (key) do nothing;

-- Le declencheur d'inscription suit desormais ce reglage : un compte cree
-- apres un changement d'offre recoit le bon quota, sans intervention.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  q bigint;
begin
  select coalesce((select value::bigint from settings where key = 'free_quota'), 1099511627776)
    into q;

  insert into profiles (id, name, email, quota)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',
             new.raw_user_meta_data->>'full_name',
             split_part(new.email, '@', 1)),
    new.email,
    q
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

select key, value, round(value::bigint / 1024.0^4, 2) as en_to from settings;
