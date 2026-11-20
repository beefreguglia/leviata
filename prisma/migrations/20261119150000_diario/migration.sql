-- CreateEnum
CREATE TYPE "DiaryKind" AS ENUM ('ACAO', 'CONFLITO', 'POLICIA', 'NEGOCIO', 'EVENTO', 'OUTRO');

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "kind" "DiaryKind" NOT NULL DEFAULT 'OUTRO',
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,
    "factionId" TEXT,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryEntry_happenedAt_idx" ON "DiaryEntry"("happenedAt");

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Permissões do Diário: todo mundo que acessa o painel lê e registra;
-- quem pode apagar facções também edita e apaga os registros dos outros.
UPDATE "Rank" SET "permissions" = "permissions" || ARRAY['diario.ver', 'diario.criar']::text[] WHERE 'painel.ver' = ANY("permissions") AND NOT ('diario.ver' = ANY("permissions"));
UPDATE "Sector" SET "permissions" = "permissions" || ARRAY['diario.ver', 'diario.criar']::text[] WHERE 'painel.ver' = ANY("permissions") AND NOT ('diario.ver' = ANY("permissions"));
UPDATE "Management" SET "permissions" = "permissions" || ARRAY['diario.ver', 'diario.criar']::text[] WHERE 'painel.ver' = ANY("permissions") AND NOT ('diario.ver' = ANY("permissions"));
UPDATE "Rank" SET "permissions" = "permissions" || ARRAY['diario.editar', 'diario.apagar']::text[] WHERE 'faccoes.apagar' = ANY("permissions") AND NOT ('diario.editar' = ANY("permissions"));
UPDATE "Sector" SET "permissions" = "permissions" || ARRAY['diario.editar', 'diario.apagar']::text[] WHERE 'faccoes.apagar' = ANY("permissions") AND NOT ('diario.editar' = ANY("permissions"));
UPDATE "Management" SET "permissions" = "permissions" || ARRAY['diario.editar', 'diario.apagar']::text[] WHERE 'faccoes.apagar' = ANY("permissions") AND NOT ('diario.editar' = ANY("permissions"));
