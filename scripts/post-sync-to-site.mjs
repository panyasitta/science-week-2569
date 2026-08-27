import { readFile } from "node:fs/promises";

const SITE_SYNC_URL = "https://science-week-2569.chaiyarit-p94.chatgpt.site/api/sync/github";
const OIDC_AUDIENCE = "science-week-2569-sync";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const oidcUrl = new URL(requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_URL"));
oidcUrl.searchParams.set("audience", OIDC_AUDIENCE);
const oidcResponse = await fetch(oidcUrl, {
  headers: { Authorization: `Bearer ${requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_TOKEN")}` },
});
if (!oidcResponse.ok) throw new Error(`GitHub OIDC request failed (${oidcResponse.status})`);
const oidcBody = await oidcResponse.json();
if (typeof oidcBody.value !== "string") throw new Error("GitHub OIDC response did not contain a token");

const snapshot = JSON.parse(await readFile("data/sync-data.json", "utf8"));
const response = await fetch(SITE_SYNC_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${oidcBody.value}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sourceRevision: requiredEnvironment("GITHUB_SHA"),
    snapshot,
  }),
});
const responseText = await response.text();
if (!response.ok) throw new Error(`Site sync failed (${response.status}): ${responseText.slice(0, 1_000)}`);
const summary = JSON.parse(responseText);
console.log(`Synced ${summary.activitiesChanged ?? 0} activities and ${summary.certificatesChanged ?? 0} certificates to GPT Site.`);
