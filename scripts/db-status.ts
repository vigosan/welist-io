import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = process.argv[2] ?? "dev";

const opPaths: Record<string, string> = {
  dev: "op://Private/Apunta/apunta-dev-db",
  prod: "op://Private/Apunta/apunta-prod-db",
};

const opPath = opPaths[env];

if (!opPath) {
  console.error(`Unknown environment: ${env}. Use 'dev' or 'prod'.`);
  process.exit(1);
}

let dbUrl: string;
try {
  dbUrl = execSync(`op read "${opPath}"`, { encoding: "utf-8" }).trim();
} catch {
  console.error(`Failed to read database URL from 1Password: ${opPath}`);
  console.error("Make sure you are signed in to 1Password CLI (op signin)");
  process.exit(1);
}

const journalPath = resolve(process.cwd(), "src/db/migrations/meta/_journal.json");
const migrationsDir = resolve(process.cwd(), "src/db/migrations");
const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as { entries: { tag: string }[] };

function computeHash(tag: string): string | null {
  const sqlPath = resolve(migrationsDir, `${tag}.sql`);
  if (!existsSync(sqlPath)) return null;
  const content = readFileSync(sqlPath, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

console.log(`\nMigration Status for ${env.toUpperCase()}`);
console.log(`Using: 1Password (${opPath})\n`);

const sql = neon(dbUrl!);

try {
  const tableExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
    )
  `;

  if (!(tableExists[0] as { exists: boolean }).exists) {
    console.log("Migrations table does not exist yet.\n");
    for (const entry of journal.entries) console.log(`pending: ${entry.tag}`);
    process.exit(0);
  }

  const applied = await sql`SELECT hash FROM drizzle."__drizzle_migrations"`;
  const appliedHashes = new Set(applied.map((r) => r.hash as string));

  const pending: string[] = [];
  const completed: string[] = [];

  for (const entry of journal.entries) {
    const hash = computeHash(entry.tag);
    if (hash && appliedHashes.has(hash)) completed.push(entry.tag);
    else pending.push(entry.tag);
  }

  if (completed.length > 0) {
    console.log("Applied:");
    for (const name of completed) console.log(`  ${name}`);
  }

  if (pending.length > 0) {
    console.log("\nPending:");
    for (const name of pending) console.log(`  ${name}`);
  } else {
    console.log("\nAll migrations applied!");
  }
  console.log("");
} catch (error) {
  console.error("Error:", (error as Error).message);
  process.exit(1);
}
