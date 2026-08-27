import { mkdir, writeFile } from "node:fs/promises";

const SITE_SNAPSHOT_URL = "https://science-week-2569.chaiyarit-p94.chatgpt.site/api/sync/snapshot";
const response = await fetch(SITE_SNAPSHOT_URL, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Site snapshot request failed (${response.status})`);
const snapshot = await response.json();
if (
  snapshot?.schemaVersion !== 1
  || !snapshot.meta
  || !snapshot.activities
  || Object.keys(snapshot.activities).length !== 11
  || !Array.isArray(snapshot.certificates)
) {
  throw new Error("Site returned an invalid sync snapshot");
}
await mkdir("data", { recursive: true });
await writeFile("data/sync-data.json", `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Pulled ${Object.keys(snapshot.activities).length} activities and ${snapshot.certificates.length} certificates from GPT Site.`);
