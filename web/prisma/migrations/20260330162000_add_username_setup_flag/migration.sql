ALTER TABLE "user"
ADD COLUMN "usernameNeedsSetup" BOOLEAN NOT NULL DEFAULT false;

UPDATE "user" AS u
SET "usernameNeedsSetup" = true
WHERE NOT EXISTS (
    SELECT
      1
    FROM "account" AS a
    WHERE
      a."userId" = u."id"
      AND a."providerId" = 'credential'
  );
