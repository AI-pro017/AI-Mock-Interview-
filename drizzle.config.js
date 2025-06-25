import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default {
  schema: "./utils/schema.js",
  out: "./drizzle",
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEXT_PUBLIC_DRIZZLE_DB_URL,
  }
};