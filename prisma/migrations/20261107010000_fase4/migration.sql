-- CreateEnum
CREATE TYPE "VaultKind" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "VaultAsset" AS ENUM ('DINHEIRO_SUJO', 'DINHEIRO_LIMPO', 'ITEM');

-- CreateEnum
CREATE TYPE "VaultStatus" AS ENUM ('PENDENTE', 'CONFIRMADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ABERTA', 'PRODUCAO', 'PRONTA', 'ENTREGUE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PunishmentKind" AS ENUM ('ADVERTENCIA', 'MULTA', 'SUSPENSAO', 'REBAIXAMENTO', 'EXPULSAO');

-- CreateEnum
CREATE TYPE "PunishmentStatus" AS ENUM ('ATIVA', 'CUMPRIDA', 'REVOGADA');

-- CreateTable
CREATE TABLE "VaultTransaction" (
    "id" TEXT NOT NULL,
    "kind" "VaultKind" NOT NULL,
    "asset" "VaultAsset" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "VaultStatus" NOT NULL DEFAULT 'CONFIRMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "itemId" TEXT,
    "memberId" TEXT,
    "createdById" TEXT,
    "confirmedById" TEXT,
    "orderId" TEXT,

    CONSTRAINT "VaultTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmGoal" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,
    "rankId" TEXT,

    CONSTRAINT "FarmGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'ABERTA',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "notes" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT NOT NULL,
    "factionId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Punishment" (
    "id" TEXT NOT NULL,
    "kind" "PunishmentKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "fineAmount" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "status" "PunishmentStatus" NOT NULL DEFAULT 'ATIVA',
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "memberId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Punishment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VaultTransaction_status_asset_itemId_idx" ON "VaultTransaction"("status", "asset", "itemId");

-- CreateIndex
CREATE INDEX "VaultTransaction_memberId_createdAt_idx" ON "VaultTransaction"("memberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FarmGoal_itemId_rankId_key" ON "FarmGoal"("itemId", "rankId");

-- CreateIndex
CREATE INDEX "Order_status_dueAt_idx" ON "Order"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Punishment_memberId_status_idx" ON "Punishment"("memberId", "status");

-- AddForeignKey
ALTER TABLE "VaultTransaction" ADD CONSTRAINT "VaultTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultTransaction" ADD CONSTRAINT "VaultTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultTransaction" ADD CONSTRAINT "VaultTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultTransaction" ADD CONSTRAINT "VaultTransaction_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultTransaction" ADD CONSTRAINT "VaultTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmGoal" ADD CONSTRAINT "FarmGoal_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmGoal" ADD CONSTRAINT "FarmGoal_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

