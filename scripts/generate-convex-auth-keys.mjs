/**
 * Generate RS256 keypair for @convex-dev/auth (Convex deployment env vars).
 *
 * Usage:
 *   node scripts/generate-convex-auth-keys.mjs
 *     → prints values and instructions (paste into Convex Dashboard).
 *
 *   node scripts/generate-convex-auth-keys.mjs --apply
 *     → runs `npx convex env set` for JWT_PRIVATE_KEY and JWKS on the linked deployment.
 *       (Do not set CONVEX_SITE_URL manually — it is built into Convex Cloud.)
 *
 * @see https://labs.convex.dev/auth/setup/manual
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readEnvLocalValue(name) {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return null;
  const text = readFileSync(envPath, "utf8");
  const re = new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, "m");
  const m = text.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v || null;
}

const apply = process.argv.includes("--apply");

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKeyPem = await exportPKCS8(keys.privateKey);
const privateKeyOneLine = privateKeyPem.trimEnd().replace(/\n/g, " ");
const publicJwk = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicJwk }] });

const siteUrl =
  readEnvLocalValue("NEXT_PUBLIC_CONVEX_SITE_URL") ??
  process.env.CONVEX_SITE_URL ??
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  null;

if (apply) {
  /** Convex CLI splits values on spaces; use --from-file for PEM / JSON. */
  const runFromFile = (name, fileBody) => {
    const dir = mkdtempSync(join(tmpdir(), "convex-auth-env-"));
    const filePath = join(dir, `${name}.txt`);
    try {
      writeFileSync(filePath, fileBody, "utf8");
      const r = spawnSync(
        "npx",
        ["convex", "env", "set", name, "--from-file", filePath],
        { cwd: root, stdio: "inherit", env: process.env },
      );
      if (r.error) throw r.error;
      if (r.status !== 0) process.exit(r.status ?? 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  console.log("Setting Convex deployment environment variables…\n");
  runFromFile("JWT_PRIVATE_KEY", privateKeyPem.trimEnd() + "\n");
  runFromFile("JWKS", jwks);
  if (siteUrl) {
    console.log(
      `\nNote: CONVEX_SITE_URL is built into Convex (your site URL is ${siteUrl}).\n` +
        "No need to set it via env set.\n",
    );
  } else {
    console.warn(
      "\n[WARN] No NEXT_PUBLIC_CONVEX_SITE_URL in .env.local (optional reference only).\n",
    );
  }
  console.log("\nDone. Restart `npx convex dev` if it is running, then try sign-in again.");
} else {
  console.log("Add these to your Convex deployment (Dashboard → Settings → Environment Variables),\n");
  console.log("or run:  node scripts/generate-convex-auth-keys.mjs --apply\n");
  console.log("---");
  console.log(`JWT_PRIVATE_KEY=\n${privateKeyOneLine}\n`);
  console.log("---");
  console.log(`JWKS=\n${jwks}\n`);
  console.log("---");
  if (siteUrl) {
    console.log(`CONVEX_SITE_URL (issuer; use your Convex HTTP / Site URL):\n${siteUrl}\n`);
  } else {
    console.log(
      "CONVEX_SITE_URL: set to your site URL, e.g. https://YOUR-DEPLOYMENT.convex.site\n",
    );
  }
}
