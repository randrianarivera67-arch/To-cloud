-- Le quota gratuit passe de 500 Go a 1 To.

alter table profiles alter column quota set default 1099511627776;

update profiles set quota = 1099511627776
where quota in (107374182400, 536870912000);   -- anciens paliers 100 Go et 500 Go

select count(*) as comptes, round(quota / 1024.0 / 1024 / 1024 / 1024, 1) as quota_to
from profiles group by quota;
