-- CreateEnum
CREATE TYPE "DossierStatus" AS ENUM ('LIVRE', 'PRESO', 'FORAGIDO', 'MORTO', 'DESCONHECIDO');

-- AlterTable
ALTER TABLE "Sector" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "phone" TEXT,
    "passport" TEXT,
    "status" "DossierStatus" NOT NULL DEFAULT 'DESCONHECIDO',
    "threat" "Risk" NOT NULL DEFAULT 'BAIXO',
    "notes" TEXT,
    "imageIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "factionId" TEXT,
    "authorId" TEXT,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierVehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "model" TEXT,
    "color" TEXT,
    "dossierId" TEXT NOT NULL,

    CONSTRAINT "DossierVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierLink" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,

    CONSTRAINT "DossierLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dossier_name_idx" ON "Dossier"("name");

-- CreateIndex
CREATE INDEX "DossierVehicle_plate_idx" ON "DossierVehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "DossierLink_fromId_toId_key" ON "DossierLink"("fromId", "toId");

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierVehicle" ADD CONSTRAINT "DossierVehicle_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierLink" ADD CONSTRAINT "DossierLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierLink" ADD CONSTRAINT "DossierLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Acesso inicial (depois é editável em Hierarquia)
UPDATE "Sector" SET "permissions" = ARRAY['dossie.gerenciar'] WHERE "name" = 'Vigília';
UPDATE "Management" SET "permissions" = array_append("permissions", 'dossie.gerenciar') WHERE "name" = 'G-Investigativa' AND NOT ('dossie.gerenciar' = ANY("permissions"));
UPDATE "Management" SET "permissions" = array_append("permissions", 'radar.ver') WHERE NOT ('radar.ver' = ANY("permissions"));
