/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Brands_Session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "BrandContent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandDescription" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "phoneCompatibilityImage" TEXT NOT NULL,
    "coverageSubtitleImage" TEXT NOT NULL,
    "coverageTitle" TEXT NOT NULL,
    "coverageSubtitle" TEXT NOT NULL,
    "phoneCompatibilityTitle" TEXT NOT NULL,
    "phoneCompatibilitySubtitle" TEXT NOT NULL,
    "customUrl" TEXT NOT NULL,

    CONSTRAINT "BrandContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandContent_sessionId_key" ON "BrandContent"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Brands_Session_id_key" ON "Brands_Session"("id");

-- AddForeignKey
ALTER TABLE "BrandContent" ADD CONSTRAINT "BrandContent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Brands_Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
