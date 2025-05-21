/*
  Warnings:

  - You are about to drop the column `coverImage` on the `BrandContent` table. All the data in the column will be lost.
  - Added the required column `BannerDesktop` to the `BrandContent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `BannerImageIpad` to the `BrandContent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `BannerImageMobile` to the `BrandContent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryColor` to the `BrandContent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BrandContent" DROP COLUMN "coverImage",
ADD COLUMN     "BannerDesktop" TEXT NOT NULL,
ADD COLUMN     "BannerImageIpad" TEXT NOT NULL,
ADD COLUMN     "BannerImageMobile" TEXT NOT NULL,
ADD COLUMN     "primaryColor" TEXT NOT NULL,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "tertiaryColor" TEXT;
