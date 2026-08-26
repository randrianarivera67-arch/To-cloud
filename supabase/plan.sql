-- Distinguer les comptes payants
--
-- Sans marque, un changement d'offre gratuite touchait aussi les comptes
-- etendus contre paiement, du moment que leur quota coincidait. Ce n'est
-- acceptable ni pour eux ni pour nous.

alter table profiles add column if not exists plan text not null default 'free'
  check (plan in ('free', 'paid'));

-- Rattrapage : tout compte dont le quota s'ecarte de l'offre gratuite a
-- forcement ete etendu a la main.
update profiles
set plan = 'paid'
where quota <> coalesce(
  (select value::bigint from settings where key = 'free_quota'),
  1099511627776
);

-- Un compte dont une demande a ete acceptee est payant, quel que soit son quota.
update profiles p
set plan = 'paid'
from storage_requests r
where r.user_id = p.id and r.status = 'approved';

select plan, count(*), round(quota / 1024.0^4, 2) as quota_to
from profiles group by plan, quota order by plan;
