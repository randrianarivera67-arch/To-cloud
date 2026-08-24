-- Le quota gratuit passe de 100 a 500 Go.
--
-- Deux mouvements : la valeur par defaut pour les comptes a venir, et une mise
-- a jour des comptes existants qui sont restes a 100 Go.

alter table profiles alter column quota set default 536870912000;

update profiles set quota = 536870912000 where quota = 107374182400;

select count(*) as comptes, quota / 1024 / 1024 / 1024 as quota_go
from profiles group by quota;
