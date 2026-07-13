import { config } from "dotenv";
config({ path: "../.env" });
import { drizzle } from 'drizzle-orm/node-postgres';

export const db = drizzle(process.env.DATABASE_URL!);
