import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { query } from "../lib/db";

async function main() {
  console.log("Initializing database tables from db/schema.sql...");
  try {
    const schemaPath = path.join(process.cwd(), "db", "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    await query(sql);
    console.log("Database initialized successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
}

main();
