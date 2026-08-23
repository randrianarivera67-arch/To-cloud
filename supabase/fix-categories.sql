-- Rattrapage : les fichiers envoyes dans un dossier avant le correctif ont tous
-- ete classes en « Autres ». On les reclasse d'apres leur extension.
--
-- A executer une fois dans SQL Editor. Sans risque : seules les lignes encore
-- marquees 'hafa' sont touchees.

update files set cat = 'sary'
where cat = 'hafa' and lower(name) ~ '\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$';

update files set cat = 'video'
where cat = 'hafa' and lower(name) ~ '\.(mp4|mkv|mov|avi|webm|3gp|m4v)$';

update files set cat = 'feo'
where cat = 'hafa' and lower(name) ~ '\.(mp3|wav|ogg|m4a|flac|aac|opus)$';

update files set cat = 'doc'
where cat = 'hafa' and lower(name) ~ '\.(pdf|docx?|xlsx?|pptx?|txt|csv|odt)$';

update files set cat = 'apk'
where cat = 'hafa' and lower(name) ~ '\.(apk|aab|xapk)$';

select cat, count(*) from files where deleted_at is null group by cat order by cat;
