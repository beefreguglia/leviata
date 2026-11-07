-- CreateEnum
CREATE TYPE "MapPinCategory" AS ENUM ('BASE', 'FARM', 'DESMANCHE', 'LAVAGEM', 'LOJA', 'FUGA', 'ESCONDERIJO', 'TERRITORIO', 'ALVO', 'OUTRO');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('ACAO', 'CORRIDA', 'REUNIAO', 'TREINO', 'EVENTO');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('AGENDADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('VOU', 'TALVEZ', 'NAO_VOU');

-- CreateEnum
CREATE TYPE "EventResult" AS ENUM ('SUCESSO', 'PARCIAL', 'FALHA');

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MapPin" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "MapPinCategory" NOT NULL DEFAULT 'OUTRO',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "imageIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "farmGuideId" TEXT,
    "factionId" TEXT,
    "authorId" TEXT,

    CONSTRAINT "MapPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perimeter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "difficulty" "Risk" NOT NULL DEFAULT 'MEDIO',
    "minMembers" INTEGER,
    "plan" TEXT NOT NULL,
    "escapeRoutes" TEXT,
    "imageIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pinId" TEXT,
    "authorId" TEXT,

    CONSTRAINT "Perimeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerimeterRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "perimeterId" TEXT NOT NULL,

    CONSTRAINT "PerimeterRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "EventKind" NOT NULL DEFAULT 'ACAO',
    "status" "EventStatus" NOT NULL DEFAULT 'AGENDADO',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,
    "lineupPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "perimeterId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupSlot" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "vehicle" TEXT,
    "notes" TEXT,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT,

    CONSTRAINT "LineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReport" (
    "id" TEXT NOT NULL,
    "result" "EventResult" NOT NULL,
    "loot" TEXT,
    "money" INTEGER,
    "casualties" INTEGER,
    "arrests" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "EventReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_eventId_memberId_key" ON "Attendance"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "LineupSlot_eventId_idx" ON "LineupSlot"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReport_eventId_key" ON "EventReport"("eventId");

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_farmGuideId_fkey" FOREIGN KEY ("farmGuideId") REFERENCES "FarmGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perimeter" ADD CONSTRAINT "Perimeter_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "MapPin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perimeter" ADD CONSTRAINT "Perimeter_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerimeterRole" ADD CONSTRAINT "PerimeterRole_perimeterId_fkey" FOREIGN KEY ("perimeterId") REFERENCES "Perimeter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_perimeterId_fkey" FOREIGN KEY ("perimeterId") REFERENCES "Perimeter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSlot" ADD CONSTRAINT "LineupSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSlot" ADD CONSTRAINT "LineupSlot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReport" ADD CONSTRAINT "EventReport_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReport" ADD CONSTRAINT "EventReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

