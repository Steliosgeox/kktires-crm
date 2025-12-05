import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || 'libsql://kktires-db-steliosgeox.aws-eu-west-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQ4OTA2MDIsImlkIjoiZWJkY2I4ZjYtNDdlYS00YjI5LWFiMmYtMjc2YjM0ZTRmYWUwIiwicmlkIjoiMGNjN2U2OWEtOWJlYi00OGMyLTkwNjctOTAyYzY1M2EwNGQ3In0.bewsGe3b0I9Bel2jJciBwNsSo-dCKgoQcDQj2JZe6hMUyTN5Yt4z2dEChy6oNxgu_FKo70Q1ypwzCnnQx1TcDA',
  },
} satisfies Config;
