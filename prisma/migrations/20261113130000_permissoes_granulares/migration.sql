-- Permissões granulares: cada chave antiga vira o conjunto de chaves novas que ela cobria.
-- Ninguém perde nem ganha acesso; depois dá para desmarcar uma por uma no painel.

UPDATE "Rank" SET "permissions" = ARRAY(
  SELECT DISTINCT p FROM unnest("permissions") AS old(k),
  LATERAL unnest(
    CASE old.k
      WHEN 'membros.gerenciar' THEN ARRAY['membros.cadastrar', 'membros.editar', 'membros.patente', 'membros.setor', 'membros.desligar']
      WHEN 'hierarquia.gerenciar' THEN ARRAY['hierarquia.patentes', 'hierarquia.setores', 'hierarquia.gerencias']
      WHEN 'conteudo.editar' THEN ARRAY['lore.editar', 'faccoes.editar', 'farm.editar', 'fabricacao.editar', 'mural.editar', 'mapa.editar', 'lives.gerenciar']
      WHEN 'operacoes.gerenciar' THEN ARRAY['agenda.gerenciar', 'escalacoes.gerenciar', 'perimetros.gerenciar']
      WHEN 'financeiro.gerenciar' THEN ARRAY['bau.gerenciar', 'metas.gerenciar', 'encomendas.gerenciar', 'vendas.gerenciar']
      WHEN 'punicoes.gerenciar' THEN ARRAY['punicoes.aplicar', 'punicoes.revogar']
      WHEN 'dossie.gerenciar' THEN ARRAY['dossie.ver', 'dossie.editar']
      ELSE ARRAY[old.k]
    END
  ) AS p
  ORDER BY p
);

UPDATE "Sector" SET "permissions" = ARRAY(
  SELECT DISTINCT p FROM unnest("permissions") AS old(k),
  LATERAL unnest(
    CASE old.k
      WHEN 'membros.gerenciar' THEN ARRAY['membros.cadastrar', 'membros.editar', 'membros.patente', 'membros.setor', 'membros.desligar']
      WHEN 'hierarquia.gerenciar' THEN ARRAY['hierarquia.patentes', 'hierarquia.setores', 'hierarquia.gerencias']
      WHEN 'conteudo.editar' THEN ARRAY['lore.editar', 'faccoes.editar', 'farm.editar', 'fabricacao.editar', 'mural.editar', 'mapa.editar', 'lives.gerenciar']
      WHEN 'operacoes.gerenciar' THEN ARRAY['agenda.gerenciar', 'escalacoes.gerenciar', 'perimetros.gerenciar']
      WHEN 'financeiro.gerenciar' THEN ARRAY['bau.gerenciar', 'metas.gerenciar', 'encomendas.gerenciar', 'vendas.gerenciar']
      WHEN 'punicoes.gerenciar' THEN ARRAY['punicoes.aplicar', 'punicoes.revogar']
      WHEN 'dossie.gerenciar' THEN ARRAY['dossie.ver', 'dossie.editar']
      ELSE ARRAY[old.k]
    END
  ) AS p
  ORDER BY p
);

UPDATE "Management" SET "permissions" = ARRAY(
  SELECT DISTINCT p FROM unnest("permissions") AS old(k),
  LATERAL unnest(
    CASE old.k
      WHEN 'membros.gerenciar' THEN ARRAY['membros.cadastrar', 'membros.editar', 'membros.patente', 'membros.setor', 'membros.desligar']
      WHEN 'hierarquia.gerenciar' THEN ARRAY['hierarquia.patentes', 'hierarquia.setores', 'hierarquia.gerencias']
      WHEN 'conteudo.editar' THEN ARRAY['lore.editar', 'faccoes.editar', 'farm.editar', 'fabricacao.editar', 'mural.editar', 'mapa.editar', 'lives.gerenciar']
      WHEN 'operacoes.gerenciar' THEN ARRAY['agenda.gerenciar', 'escalacoes.gerenciar', 'perimetros.gerenciar']
      WHEN 'financeiro.gerenciar' THEN ARRAY['bau.gerenciar', 'metas.gerenciar', 'encomendas.gerenciar', 'vendas.gerenciar']
      WHEN 'punicoes.gerenciar' THEN ARRAY['punicoes.aplicar', 'punicoes.revogar']
      WHEN 'dossie.gerenciar' THEN ARRAY['dossie.ver', 'dossie.editar']
      ELSE ARRAY[old.k]
    END
  ) AS p
  ORDER BY p
);
