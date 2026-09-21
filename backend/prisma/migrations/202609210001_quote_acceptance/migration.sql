ALTER TABLE "Quote" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_revision_positive" CHECK ("revision" > 0);

CREATE TABLE "QuoteAcceptance" (
  "id" UUID NOT NULL PRIMARY KEY,
  "quoteId" UUID NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "acceptedBy" VARCHAR(120) NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consentText" TEXT NOT NULL,
  "quoteSnapshot" JSONB NOT NULL,
  CONSTRAINT "QuoteAcceptance_quoteId_fkey" FOREIGN KEY ("quoteId")
    REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuoteAcceptance_quoteId_revision_key" ON "QuoteAcceptance"("quoteId", "revision");
