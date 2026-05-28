import { execSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";

interface Args {
  env: "dev" | "prod";
  listSlug?: string;
  apply: boolean;
  limit?: number;
  delayMs: number;
  country?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const env = (argv[0] === "prod" ? "prod" : "dev") as Args["env"];
  let listSlug: string | undefined;
  let apply = false;
  let limit: number | undefined;
  let delayMs = 1100;
  let country: string | undefined;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") apply = true;
    else if (a === "--list") listSlug = argv[++i];
    else if (a === "--limit") limit = Number(argv[++i]);
    else if (a === "--delay") delayMs = Number(argv[++i]);
    else if (a === "--country") country = argv[++i];
  }
  return { env, listSlug, apply, limit, delayMs, country };
}

function splitCamel(s: string): string {
  return s.replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, "$1 $2");
}

function readDbUrl(env: "dev" | "prod"): string {
  const opPath =
    env === "prod"
      ? "op://Private/Apunta/apunta-prod-db"
      : "op://Private/Apunta/apunta-dev-db";
  try {
    const url = execSync(`op read "${opPath}"`, { encoding: "utf-8" }).trim();
    if (!url) throw new Error("empty url");
    return url;
  } catch {
    console.error(`Failed to read database URL from 1Password: ${opPath}`);
    console.error("Sign in first with: op signin");
    process.exit(1);
  }
}

const PLACE_RE = /@([a-zA-ZÀ-ÿñÑ\w]+(?: [a-zA-ZÀ-ÿñÑ\w]+)*)/g;
const TAG_RE = /#([a-zA-ZÀ-ÿñÑ\w]+)/g;

function parsePlace(text: string): string | null {
  PLACE_RE.lastIndex = 0;
  const m = PLACE_RE.exec(text);
  return m?.[1]?.trim() ?? null;
}

function parseFirstTag(text: string): string | null {
  TAG_RE.lastIndex = 0;
  const m = TAG_RE.exec(text);
  return m?.[1]?.trim() ?? null;
}

interface PhotonHit {
  name: string;
  latitude: string;
  longitude: string;
}

async function geocodeOnce(query: string): Promise<PhotonHit | null> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{
      properties?: { name?: string };
      geometry?: { coordinates?: [number, number] };
    }>;
  };
  const f = data.features?.[0];
  if (!f?.geometry?.coordinates) return null;
  return {
    name: f.properties?.name ?? query,
    latitude: String(f.geometry.coordinates[1]),
    longitude: String(f.geometry.coordinates[0]),
  };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface ItemRow {
  id: string;
  text: string;
  list_id: string;
  list_slug: string | null;
  list_name: string;
}

async function main() {
  const args = parseArgs();
  const dbUrl = readDbUrl(args.env);
  const sql = neon(dbUrl);

  const banner = [
    `\nBackfill geocoding — ${args.env.toUpperCase()}`,
    `Mode:    ${args.apply ? "APPLY (writes to DB)" : "DRY-RUN (no writes)"}`,
    args.listSlug ? `List:    ${args.listSlug}` : "List:    (all lists)",
    args.limit ? `Limit:   ${args.limit}` : null,
    `Delay:   ${args.delayMs}ms between Photon requests`,
    "",
  ]
    .filter(Boolean)
    .join("\n");
  console.log(banner);

  const rows = (args.listSlug
    ? await sql`
        SELECT i.id, i.text, i.list_id, l.slug AS list_slug, l.name AS list_name
        FROM items i
        JOIN lists l ON l.id = i.list_id
        WHERE i.latitude IS NULL
          AND i.text ~ '@'
          AND l.slug = ${args.listSlug}
        ORDER BY i.position
      `
    : await sql`
        SELECT i.id, i.text, i.list_id, l.slug AS list_slug, l.name AS list_name
        FROM items i
        JOIN lists l ON l.id = i.list_id
        WHERE i.latitude IS NULL
          AND i.text ~ '@'
        ORDER BY l.id, i.position
      `) as unknown as ItemRow[];

  const candidates = rows
    .map((r) => ({ row: r, place: parsePlace(r.text) }))
    .filter((c): c is { row: ItemRow; place: string } => !!c.place)
    .slice(0, args.limit ?? rows.length);

  console.log(
    `Found ${candidates.length} item(s) with @<place> to backfill.\n`
  );
  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let ok = 0;
  let miss = 0;
  let fail = 0;
  for (const { row, place } of candidates) {
    const rawTag = parseFirstTag(row.text);
    const tag = rawTag ? splitCamel(rawTag) : null;
    const parts = [place, tag, args.country].filter(Boolean) as string[];
    const query = parts.join(" ");
    let hit: PhotonHit | null = null;
    try {
      hit = await geocodeOnce(query);
    } catch (e) {
      fail++;
      console.log(`x  ${row.id}  "${row.text}"  fetch error: ${String(e)}`);
      await sleep(args.delayMs);
      continue;
    }
    if (!hit) {
      miss++;
      console.log(`?  ${row.id}  "${row.text}"  query="${query}"  no result`);
      await sleep(args.delayMs);
      continue;
    }
    console.log(
      `${args.apply ? "✓" : "·"}  ${row.id}  "${row.text}"  → "${hit.name}"  ${hit.latitude}, ${hit.longitude}`
    );
    if (args.apply) {
      await sql`
        UPDATE items
        SET latitude = ${hit.latitude},
            longitude = ${hit.longitude},
            place_name = ${hit.name},
            updated_at = NOW()
        WHERE id = ${row.id} AND latitude IS NULL
      `;
    }
    ok++;
    await sleep(args.delayMs);
  }

  console.log("");
  console.log(`Geocoded: ${ok}`);
  console.log(`No match: ${miss}`);
  console.log(`Errors:   ${fail}`);
  if (!args.apply)
    console.log("\nDry run — re-run with --apply to write to the DB.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
