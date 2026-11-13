-- AlterEnum
ALTER TYPE "MemberStatus" ADD VALUE 'SAIU';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "leftAt" TIMESTAMP(3),
ADD COLUMN "leftReason" TEXT;
