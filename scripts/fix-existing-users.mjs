import postgres from "postgres";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim().replace(/^"|"$/g, "")];
    })
);

const sql = postgres(env.DATABASE_URL);
const result = await sql`UPDATE users SET onboarding_completed = true WHERE onboarding_completed = false`;
console.log("Updated rows:", result.count);
await sql.end();
