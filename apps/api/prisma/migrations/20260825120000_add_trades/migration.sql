-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "offeredEntryId" TEXT,
    "requestedEntryId" TEXT,
    "offeredPokemonId" INTEGER NOT NULL,
    "offeredPokemonName" TEXT NOT NULL,
    "offeredSpriteUrl" TEXT,
    "offeredNickname" TEXT,
    "requestedPokemonId" INTEGER NOT NULL,
    "requestedPokemonName" TEXT NOT NULL,
    "requestedSpriteUrl" TEXT,
    "requestedNickname" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_initiatorId_idx" ON "Trade"("initiatorId");

-- CreateIndex
CREATE INDEX "Trade_recipientId_idx" ON "Trade"("recipientId");

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

-- CreateIndex
CREATE INDEX "Trade_offeredEntryId_idx" ON "Trade"("offeredEntryId");

-- CreateIndex
CREATE INDEX "Trade_requestedEntryId_idx" ON "Trade"("requestedEntryId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_offeredEntryId_fkey" FOREIGN KEY ("offeredEntryId") REFERENCES "CollectionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_requestedEntryId_fkey" FOREIGN KEY ("requestedEntryId") REFERENCES "CollectionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
