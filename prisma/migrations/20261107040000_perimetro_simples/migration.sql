-- Perímetro vira só título + uma foto vista de cima.

-- guarda o primeiro print como a imagem do perímetro
ALTER TABLE "Perimeter" ADD COLUMN "imageId" TEXT;
UPDATE "Perimeter" SET "imageId" = "imageIds"[1] WHERE cardinality("imageIds") > 0;

-- DropForeignKey
ALTER TABLE "Perimeter" DROP CONSTRAINT "Perimeter_pinId_fkey";

-- DropForeignKey
ALTER TABLE "PerimeterRole" DROP CONSTRAINT "PerimeterRole_perimeterId_fkey";

-- AlterTable
ALTER TABLE "Perimeter" DROP COLUMN "difficulty",
DROP COLUMN "escapeRoutes",
DROP COLUMN "imageIds",
DROP COLUMN "minMembers",
DROP COLUMN "pinId",
DROP COLUMN "plan",
DROP COLUMN "target";

-- DropTable
DROP TABLE "PerimeterRole";
