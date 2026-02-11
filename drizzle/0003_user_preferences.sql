CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "notifications" TEXT NOT NULL,
  "theme" TEXT NOT NULL DEFAULT 'dark',
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_org_uidx"
  ON "user_preferences" ("user_id", "org_id");

