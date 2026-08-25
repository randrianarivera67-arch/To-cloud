-- Autorise un utilisateur a creer son propre profil.
--
-- Le declencheur `handle_new_user` s'en charge a l'inscription, mais il ne
-- couvre pas les comptes crees avant sa pose, ni les cas ou il n'a pas pu
-- s'executer. Sans cette regle, l'application ne peut pas reparer elle-meme
-- un profil manquant et renvoie vers l'ecran de connexion.

drop policy if exists "profil creable par son proprietaire" on profiles;

create policy "profil creable par son proprietaire"
  on profiles for insert with check (auth.uid() = id);

-- Rattrapage : cree les profils absents pour les comptes existants.
insert into profiles (id, name)
select u.id,
       coalesce(u.raw_user_meta_data->>'name',
                u.raw_user_meta_data->>'full_name',
                split_part(u.email, '@', 1))
from auth.users u
left join profiles p on p.id = u.id
where p.id is null;

select count(*) as profils from profiles;
