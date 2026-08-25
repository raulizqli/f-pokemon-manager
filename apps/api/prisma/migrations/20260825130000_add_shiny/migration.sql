-- AlterTable
ALTER TABLE "CollectionEntry" ADD COLUMN "isShiny" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex
DROP INDEX "CollectionEntry_userId_pokemonId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEntry_userId_pokemonId_isShiny_key" ON "CollectionEntry"("userId", "pokemonId", "isShiny");

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "offeredIsShiny" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Trade" ADD COLUMN "requestedIsShiny" BOOLEAN NOT NULL DEFAULT false;
