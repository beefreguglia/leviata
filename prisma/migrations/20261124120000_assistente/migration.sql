-- CreateTable
CREATE TABLE "AssistantUsage" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssistantUsage_pkey" PRIMARY KEY ("userId","day")
);

-- Assistente: todo mundo que acessa o painel pode usar o chat.
UPDATE "Rank" SET "permissions" = "permissions" || ARRAY['assistente.ver']::text[] WHERE 'painel.ver' = ANY("permissions") AND NOT ('assistente.ver' = ANY("permissions"));
UPDATE "Sector" SET "permissions" = "permissions" || ARRAY['assistente.ver']::text[] WHERE 'painel.ver' = ANY("permissions") AND NOT ('assistente.ver' = ANY("permissions"));
UPDATE "Management" SET "permissions" = "permissions" || ARRAY['assistente.ver']::text[] WHERE 'painel.ver' = ANY("permissions") AND NOT ('assistente.ver' = ANY("permissions"));
