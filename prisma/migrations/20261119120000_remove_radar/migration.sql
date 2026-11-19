-- O radar de inatividade foi removido do painel: tira a permissão que não existe mais.
UPDATE "Rank" SET "permissions" = array_remove("permissions", 'radar.ver');
UPDATE "Sector" SET "permissions" = array_remove("permissions", 'radar.ver');
UPDATE "Management" SET "permissions" = array_remove("permissions", 'radar.ver');
