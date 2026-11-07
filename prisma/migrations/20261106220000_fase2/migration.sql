-- CreateEnum
CREATE TYPE "LoreCategory" AS ENUM ('HISTORIA', 'EVENTO', 'PERSONAGEM', 'LUGAR', 'ALIANCA');

-- CreateEnum
CREATE TYPE "FactionRelation" AS ENUM ('ALIADA', 'NEUTRA', 'TENSA', 'INIMIGA', 'GUERRA');

-- CreateEnum
CREATE TYPE "FactionEventKind" AS ENUM ('ACORDO', 'CONFLITO', 'TRAICAO', 'NEGOCIO', 'RELACAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "Risk" AS ENUM ('BAIXO', 'MEDIO', 'ALTO');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('NORMAL', 'IMPORTANTE', 'URGENTE');

-- CreateEnum
CREATE TYPE "StreamPlatform" AS ENUM ('TWITCH', 'KICK', 'YOUTUBE');

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaderId" TEXT,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoreArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "category" "LoreCategory" NOT NULL DEFAULT 'HISTORIA',
    "happenedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coverId" TEXT,
    "authorId" TEXT,

    CONSTRAINT "LoreArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT,
    "color" TEXT NOT NULL DEFAULT '#8d8d99',
    "relation" "FactionRelation" NOT NULL DEFAULT 'NEUTRA',
    "kind" TEXT,
    "territory" TEXT,
    "leader" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "logoId" TEXT,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactionEvent" (
    "id" TEXT NOT NULL,
    "kind" "FactionEventKind" NOT NULL DEFAULT 'OUTRO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "factionId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "FactionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "isIllegal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmGuide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "howTo" TEXT NOT NULL,
    "amountPerRun" INTEGER,
    "minutesPerRun" INTEGER,
    "risk" "Risk" NOT NULL DEFAULT 'BAIXO',
    "requirements" TEXT,
    "imageIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT,
    "authorId" TEXT,

    CONSTRAINT "FarmGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "outputQty" INTEGER NOT NULL DEFAULT 1,
    "minutes" INTEGER,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "outputItemId" TEXT NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeInput" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "RecipeInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "NoticePriority" NOT NULL DEFAULT 'NORMAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flyer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "Flyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamChannel" (
    "id" TEXT NOT NULL,
    "platform" "StreamPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "viewers" INTEGER,
    "thumbnailUrl" TEXT,
    "category" TEXT,
    "startedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "StreamChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Upload_key_key" ON "Upload"("key");

-- CreateIndex
CREATE UNIQUE INDEX "LoreArticle_slug_key" ON "LoreArticle"("slug");

-- CreateIndex
CREATE INDEX "LoreArticle_happenedAt_idx" ON "LoreArticle"("happenedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Faction_name_key" ON "Faction"("name");

-- CreateIndex
CREATE INDEX "FactionEvent_factionId_happenedAt_idx" ON "FactionEvent"("factionId", "happenedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeInput_recipeId_itemId_key" ON "RecipeInput"("recipeId", "itemId");

-- CreateIndex
CREATE INDEX "Notice_isPinned_createdAt_idx" ON "Notice"("isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "StreamChannel_isLive_idx" ON "StreamChannel"("isLive");

-- CreateIndex
CREATE UNIQUE INDEX "StreamChannel_platform_handle_key" ON "StreamChannel"("platform", "handle");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoreArticle" ADD CONSTRAINT "LoreArticle_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoreArticle" ADD CONSTRAINT "LoreArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faction" ADD CONSTRAINT "Faction_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionEvent" ADD CONSTRAINT "FactionEvent_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionEvent" ADD CONSTRAINT "FactionEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmGuide" ADD CONSTRAINT "FarmGuide_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmGuide" ADD CONSTRAINT "FarmGuide_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeInput" ADD CONSTRAINT "RecipeInput_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeInput" ADD CONSTRAINT "RecipeInput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flyer" ADD CONSTRAINT "Flyer_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flyer" ADD CONSTRAINT "Flyer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamChannel" ADD CONSTRAINT "StreamChannel_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

