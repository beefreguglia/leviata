-- Permissões em CRUD por área (ver, criar, editar, apagar).
-- Cada chave da versão anterior vira as novas equivalentes: ninguém perde nem ganha acesso.
-- "painel.ver" agora também marca o "ver" das áreas que todo membro já enxergava.

UPDATE "Rank" SET "permissions" = ARRAY(
  SELECT DISTINCT p FROM unnest("permissions") AS old(k),
  LATERAL unnest(
    CASE old.k
      WHEN 'painel.ver' THEN ARRAY['painel.ver', 'membros.ver', 'hierarquia.ver', 'ausencias.criar', 'agenda.ver', 'escalacoes.ver', 'perimetros.ver', 'mapa.ver', 'lore.ver', 'faccoes.ver', 'mural.ver', 'lives.ver', 'lives.criar']::text[]
      WHEN 'economia.ver' THEN ARRAY['farm.ver', 'fabricacao.ver', 'bau.ver', 'metas.ver', 'encomendas.ver', 'vendas.ver']::text[]
      WHEN 'membros.cadastrar' THEN ARRAY['membros.criar']::text[]
      WHEN 'membros.desligar' THEN ARRAY['membros.apagar']::text[]
      WHEN 'hierarquia.patentes' THEN ARRAY['patentes.criar', 'patentes.editar', 'patentes.apagar']::text[]
      WHEN 'hierarquia.setores' THEN ARRAY['setores.criar', 'setores.editar', 'setores.apagar']::text[]
      WHEN 'hierarquia.gerencias' THEN ARRAY['gerencias.criar', 'gerencias.editar', 'gerencias.apagar']::text[]
      WHEN 'regras.editar' THEN ARRAY['regras.criar', 'regras.editar', 'regras.apagar']::text[]
      WHEN 'lore.editar' THEN ARRAY['lore.criar', 'lore.editar', 'lore.apagar']::text[]
      WHEN 'faccoes.editar' THEN ARRAY['faccoes.criar', 'faccoes.editar', 'faccoes.apagar']::text[]
      WHEN 'farm.editar' THEN ARRAY['farm.criar', 'farm.editar', 'farm.apagar']::text[]
      WHEN 'fabricacao.editar' THEN ARRAY['fabricacao.criar', 'fabricacao.editar', 'fabricacao.apagar']::text[]
      WHEN 'mural.editar' THEN ARRAY['mural.criar', 'mural.editar', 'mural.apagar']::text[]
      WHEN 'mapa.editar' THEN ARRAY['mapa.criar', 'mapa.editar', 'mapa.apagar']::text[]
      WHEN 'dossie.editar' THEN ARRAY['dossie.criar', 'dossie.editar', 'dossie.apagar']::text[]
      WHEN 'lives.gerenciar' THEN ARRAY['lives.editar', 'lives.apagar']::text[]
      WHEN 'agenda.gerenciar' THEN ARRAY['agenda.criar', 'agenda.editar', 'agenda.apagar']::text[]
      WHEN 'escalacoes.gerenciar' THEN ARRAY['escalacoes.editar']::text[]
      WHEN 'perimetros.gerenciar' THEN ARRAY['perimetros.criar', 'perimetros.editar', 'perimetros.apagar']::text[]
      WHEN 'bau.gerenciar' THEN ARRAY['bau.criar', 'bau.editar', 'bau.apagar']::text[]
      WHEN 'metas.gerenciar' THEN ARRAY['metas.criar', 'metas.editar', 'metas.apagar']::text[]
      WHEN 'encomendas.gerenciar' THEN ARRAY['encomendas.criar', 'encomendas.editar', 'encomendas.apagar']::text[]
      WHEN 'vendas.gerenciar' THEN ARRAY['vendas.criar', 'vendas.apagar']::text[]
      WHEN 'punicoes.aplicar' THEN ARRAY['punicoes.ver', 'punicoes.criar']::text[]
      WHEN 'punicoes.revogar' THEN ARRAY['punicoes.ver', 'punicoes.editar', 'punicoes.apagar']::text[]
      WHEN 'ausencias.gerenciar' THEN ARRAY['ausencias.ver', 'ausencias.editar', 'ausencias.apagar']::text[]
      WHEN 'radar.ver' THEN ARRAY[]::text[]
      ELSE ARRAY[old.k]
    END
  ) AS p
  ORDER BY p
);

UPDATE "Sector" SET "permissions" = ARRAY(
  SELECT DISTINCT p FROM unnest("permissions") AS old(k),
  LATERAL unnest(
    CASE old.k
      WHEN 'painel.ver' THEN ARRAY['painel.ver', 'membros.ver', 'hierarquia.ver', 'ausencias.criar', 'agenda.ver', 'escalacoes.ver', 'perimetros.ver', 'mapa.ver', 'lore.ver', 'faccoes.ver', 'mural.ver', 'lives.ver', 'lives.criar']::text[]
      WHEN 'economia.ver' THEN ARRAY['farm.ver', 'fabricacao.ver', 'bau.ver', 'metas.ver', 'encomendas.ver', 'vendas.ver']::text[]
      WHEN 'membros.cadastrar' THEN ARRAY['membros.criar']::text[]
      WHEN 'membros.desligar' THEN ARRAY['membros.apagar']::text[]
      WHEN 'hierarquia.patentes' THEN ARRAY['patentes.criar', 'patentes.editar', 'patentes.apagar']::text[]
      WHEN 'hierarquia.setores' THEN ARRAY['setores.criar', 'setores.editar', 'setores.apagar']::text[]
      WHEN 'hierarquia.gerencias' THEN ARRAY['gerencias.criar', 'gerencias.editar', 'gerencias.apagar']::text[]
      WHEN 'regras.editar' THEN ARRAY['regras.criar', 'regras.editar', 'regras.apagar']::text[]
      WHEN 'lore.editar' THEN ARRAY['lore.criar', 'lore.editar', 'lore.apagar']::text[]
      WHEN 'faccoes.editar' THEN ARRAY['faccoes.criar', 'faccoes.editar', 'faccoes.apagar']::text[]
      WHEN 'farm.editar' THEN ARRAY['farm.criar', 'farm.editar', 'farm.apagar']::text[]
      WHEN 'fabricacao.editar' THEN ARRAY['fabricacao.criar', 'fabricacao.editar', 'fabricacao.apagar']::text[]
      WHEN 'mural.editar' THEN ARRAY['mural.criar', 'mural.editar', 'mural.apagar']::text[]
      WHEN 'mapa.editar' THEN ARRAY['mapa.criar', 'mapa.editar', 'mapa.apagar']::text[]
      WHEN 'dossie.editar' THEN ARRAY['dossie.criar', 'dossie.editar', 'dossie.apagar']::text[]
      WHEN 'lives.gerenciar' THEN ARRAY['lives.editar', 'lives.apagar']::text[]
      WHEN 'agenda.gerenciar' THEN ARRAY['agenda.criar', 'agenda.editar', 'agenda.apagar']::text[]
      WHEN 'escalacoes.gerenciar' THEN ARRAY['escalacoes.editar']::text[]
      WHEN 'perimetros.gerenciar' THEN ARRAY['perimetros.criar', 'perimetros.editar', 'perimetros.apagar']::text[]
      WHEN 'bau.gerenciar' THEN ARRAY['bau.criar', 'bau.editar', 'bau.apagar']::text[]
      WHEN 'metas.gerenciar' THEN ARRAY['metas.criar', 'metas.editar', 'metas.apagar']::text[]
      WHEN 'encomendas.gerenciar' THEN ARRAY['encomendas.criar', 'encomendas.editar', 'encomendas.apagar']::text[]
      WHEN 'vendas.gerenciar' THEN ARRAY['vendas.criar', 'vendas.apagar']::text[]
      WHEN 'punicoes.aplicar' THEN ARRAY['punicoes.ver', 'punicoes.criar']::text[]
      WHEN 'punicoes.revogar' THEN ARRAY['punicoes.ver', 'punicoes.editar', 'punicoes.apagar']::text[]
      WHEN 'ausencias.gerenciar' THEN ARRAY['ausencias.ver', 'ausencias.editar', 'ausencias.apagar']::text[]
      WHEN 'radar.ver' THEN ARRAY[]::text[]
      ELSE ARRAY[old.k]
    END
  ) AS p
  ORDER BY p
);

UPDATE "Management" SET "permissions" = ARRAY(
  SELECT DISTINCT p FROM unnest("permissions") AS old(k),
  LATERAL unnest(
    CASE old.k
      WHEN 'painel.ver' THEN ARRAY['painel.ver', 'membros.ver', 'hierarquia.ver', 'ausencias.criar', 'agenda.ver', 'escalacoes.ver', 'perimetros.ver', 'mapa.ver', 'lore.ver', 'faccoes.ver', 'mural.ver', 'lives.ver', 'lives.criar']::text[]
      WHEN 'economia.ver' THEN ARRAY['farm.ver', 'fabricacao.ver', 'bau.ver', 'metas.ver', 'encomendas.ver', 'vendas.ver']::text[]
      WHEN 'membros.cadastrar' THEN ARRAY['membros.criar']::text[]
      WHEN 'membros.desligar' THEN ARRAY['membros.apagar']::text[]
      WHEN 'hierarquia.patentes' THEN ARRAY['patentes.criar', 'patentes.editar', 'patentes.apagar']::text[]
      WHEN 'hierarquia.setores' THEN ARRAY['setores.criar', 'setores.editar', 'setores.apagar']::text[]
      WHEN 'hierarquia.gerencias' THEN ARRAY['gerencias.criar', 'gerencias.editar', 'gerencias.apagar']::text[]
      WHEN 'regras.editar' THEN ARRAY['regras.criar', 'regras.editar', 'regras.apagar']::text[]
      WHEN 'lore.editar' THEN ARRAY['lore.criar', 'lore.editar', 'lore.apagar']::text[]
      WHEN 'faccoes.editar' THEN ARRAY['faccoes.criar', 'faccoes.editar', 'faccoes.apagar']::text[]
      WHEN 'farm.editar' THEN ARRAY['farm.criar', 'farm.editar', 'farm.apagar']::text[]
      WHEN 'fabricacao.editar' THEN ARRAY['fabricacao.criar', 'fabricacao.editar', 'fabricacao.apagar']::text[]
      WHEN 'mural.editar' THEN ARRAY['mural.criar', 'mural.editar', 'mural.apagar']::text[]
      WHEN 'mapa.editar' THEN ARRAY['mapa.criar', 'mapa.editar', 'mapa.apagar']::text[]
      WHEN 'dossie.editar' THEN ARRAY['dossie.criar', 'dossie.editar', 'dossie.apagar']::text[]
      WHEN 'lives.gerenciar' THEN ARRAY['lives.editar', 'lives.apagar']::text[]
      WHEN 'agenda.gerenciar' THEN ARRAY['agenda.criar', 'agenda.editar', 'agenda.apagar']::text[]
      WHEN 'escalacoes.gerenciar' THEN ARRAY['escalacoes.editar']::text[]
      WHEN 'perimetros.gerenciar' THEN ARRAY['perimetros.criar', 'perimetros.editar', 'perimetros.apagar']::text[]
      WHEN 'bau.gerenciar' THEN ARRAY['bau.criar', 'bau.editar', 'bau.apagar']::text[]
      WHEN 'metas.gerenciar' THEN ARRAY['metas.criar', 'metas.editar', 'metas.apagar']::text[]
      WHEN 'encomendas.gerenciar' THEN ARRAY['encomendas.criar', 'encomendas.editar', 'encomendas.apagar']::text[]
      WHEN 'vendas.gerenciar' THEN ARRAY['vendas.criar', 'vendas.apagar']::text[]
      WHEN 'punicoes.aplicar' THEN ARRAY['punicoes.ver', 'punicoes.criar']::text[]
      WHEN 'punicoes.revogar' THEN ARRAY['punicoes.ver', 'punicoes.editar', 'punicoes.apagar']::text[]
      WHEN 'ausencias.gerenciar' THEN ARRAY['ausencias.ver', 'ausencias.editar', 'ausencias.apagar']::text[]
      WHEN 'radar.ver' THEN ARRAY[]::text[]
      ELSE ARRAY[old.k]
    END
  ) AS p
  ORDER BY p
);
