-- Enforce at most one pending trade per collection entry (offered or requested).
CREATE UNIQUE INDEX "Trade_offeredEntryId_pending_key"
ON "Trade"("offeredEntryId")
WHERE status = 'pending' AND "offeredEntryId" IS NOT NULL;

CREATE UNIQUE INDEX "Trade_requestedEntryId_pending_key"
ON "Trade"("requestedEntryId")
WHERE status = 'pending' AND "requestedEntryId" IS NOT NULL;
