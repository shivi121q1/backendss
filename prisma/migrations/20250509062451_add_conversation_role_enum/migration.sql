-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'inprogress', 'launched');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'bot');

-- CreateTable
CREATE TABLE "Brands_Session" (
    "id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "currentIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Brands_Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand_QA" (
    "id" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "Brand_QA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_QA_sessionId_stepKey_key" ON "Brand_QA"("sessionId", "stepKey");

-- AddForeignKey
ALTER TABLE "Brand_QA" ADD CONSTRAINT "Brand_QA_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Brands_Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Brands_Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
