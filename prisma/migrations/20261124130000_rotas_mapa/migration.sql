-- CreateTable
CREATE TABLE "MapRouteProgress" (
    "memberId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "done" INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapRouteProgress_pkey" PRIMARY KEY ("memberId","routeKey")
);

-- AddForeignKey
ALTER TABLE "MapRouteProgress" ADD CONSTRAINT "MapRouteProgress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

