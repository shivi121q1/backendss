-- CreateTable
CREATE TABLE "BrandLogo" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT,
    "tertiaryColor" TEXT,

    CONSTRAINT "BrandLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandLogo_sessionId_key" ON "BrandLogo"("sessionId");

-- AddForeignKey
ALTER TABLE "BrandLogo" ADD CONSTRAINT "BrandLogo_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Brands_Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
